"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkEditPin, checkEditPinFromForm } from "@/lib/edit-pin";

const DELIVERY = z.enum(["onsite", "online", "hybrid"]);
const STATUS = z.enum(["draft", "scheduled", "cancelled"]);
const DAY = z.coerce.number().int().min(1).max(7);
const TIME = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "เวลาไม่ถูก format");

const EventUpdate = z.object({
  id: z.string().uuid(),
  title_th: z.string().trim().min(1, "ใส่ชื่อคลาส").max(200),
  status: STATUS,
  day_of_week: DAY,
  start_time: TIME,
  end_time: TIME,
  delivery_mode: DELIVERY.nullable().optional(),
  room_id: z.string().uuid().nullable().optional(),
  tutor_profile_id: z.string().uuid().nullable().optional(),
  course_id: z.string().uuid().nullable().optional(),
  planned_student_count: z
    .union([z.coerce.number().int().positive(), z.literal("").transform(() => null)])
    .nullable()
    .optional(),
  notes: z.string().nullable().or(z.literal("").transform(() => null)).optional(),
});

export type EventUpdateState = {
  ok?: boolean;
  error?: string;
  conflict?: boolean;
  fieldErrors?: Partial<Record<keyof z.infer<typeof EventUpdate>, string>>;
};

function flattenErrors(err: z.ZodError): EventUpdateState["fieldErrors"] {
  const out: EventUpdateState["fieldErrors"] = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof z.infer<typeof EventUpdate>;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function fdToInput(fd: FormData) {
  const trim = (k: string) => {
    const v = fd.get(k);
    return v && v !== "" ? (v as string) : null;
  };
  return {
    id: fd.get("id") as string,
    title_th: fd.get("title_th") as string,
    status: fd.get("status") as string,
    day_of_week: fd.get("day_of_week") as string,
    start_time: fd.get("start_time") as string,
    end_time: fd.get("end_time") as string,
    delivery_mode: trim("delivery_mode"),
    room_id: trim("room_id"),
    tutor_profile_id: trim("tutor_profile_id"),
    course_id: trim("course_id"),
    planned_student_count: (fd.get("planned_student_count") as string) || "",
    notes: (fd.get("notes") as string) || "",
  };
}

// ---------------------------------------------------------
// updateEvent
// ---------------------------------------------------------
export async function updateEvent(
  _prev: EventUpdateState,
  fd: FormData,
): Promise<EventUpdateState> {
  const pinErr = checkEditPinFromForm(fd);
  if (pinErr) return { error: pinErr };

  const parsed = EventUpdate.safeParse(fdToInput(fd));
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง", fieldErrors: flattenErrors(parsed.error) };
  }

  const data = parsed.data;
  const startT = data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time;
  const endT = data.end_time.length === 5 ? `${data.end_time}:00` : data.end_time;
  if (endT <= startT) {
    return { error: "เวลาจบต้องมากกว่าเวลาเริ่ม" };
  }

  // กฎ delivery_mode ↔ room
  if (data.delivery_mode === "online" && data.room_id) {
    return { error: "คลาสออนไลน์ต้องไม่ระบุห้อง — เลือก room = ไม่ระบุ" };
  }
  if (
    data.delivery_mode &&
    data.delivery_mode !== "online" &&
    !data.room_id
  ) {
    return { error: "คลาส onsite/hybrid ต้องระบุห้อง" };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("schedule_events")
    .update({
      title_th: data.title_th,
      status: data.status,
      day_of_week: data.day_of_week,
      start_time: startT,
      end_time: endT,
      delivery_mode: data.delivery_mode ?? null,
      room_id: data.room_id ?? null,
      tutor_profile_id: data.tutor_profile_id ?? null,
      course_id: data.course_id ?? null,
      planned_student_count: data.planned_student_count ?? null,
      notes: data.notes ?? null,
    })
    .eq("id", data.id);

  if (error) {
    if (error.code === "23P01") {
      return {
        error: "ช่วงเวลานี้ชนกับคลาส/ห้องที่จองไว้แล้ว",
        conflict: true,
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/room-schedule");
  revalidatePath("/tutor/my-schedule");
  return { ok: true };
}

// ---------------------------------------------------------
// moveEvent — ลาก event ข้ามห้อง/เวลา (partial update)
// ใช้ตอน drag-and-drop event บน grid
// ---------------------------------------------------------
const MoveInput = z.object({
  id: z.string().uuid(),
  day_of_week: DAY,
  start_time: TIME,
  room_id: z.string().uuid().nullable(),
  pin: z.string().optional(),
});

export type MoveEventResult = {
  ok: boolean;
  error?: string;
  conflict?: boolean;
};

export async function moveEvent(
  input: z.infer<typeof MoveInput>,
): Promise<MoveEventResult> {
  const pinErr = checkEditPin(input.pin);
  if (pinErr) return { ok: false, error: pinErr };

  const parsed = MoveInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = createServerSupabase();

  // 1. โหลด event เดิม → คำนวณ duration เพื่อเลื่อนเวลาจบให้สอดคล้อง
  const { data: ev, error: loadErr } = await supabase
    .from("schedule_events")
    .select("start_time, end_time, delivery_mode, event_type")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (loadErr) return { ok: false, error: loadErr.message };
  if (!ev) return { ok: false, error: "ไม่พบ event" };

  // ระยะเวลาเดิม (นาที)
  const [sh, sm] = (ev.start_time as string).slice(0, 5).split(":").map(Number);
  const [eh, em] = (ev.end_time as string).slice(0, 5).split(":").map(Number);
  const durationMin = eh * 60 + em - (sh * 60 + sm);

  const [nsh, nsm] = parsed.data.start_time.slice(0, 5).split(":").map(Number);
  const newEndMin = nsh * 60 + nsm + durationMin;
  if (newEndMin > 24 * 60) {
    return { ok: false, error: "event จบหลังเที่ยงคืน — เลือกเวลาเริ่มที่เร็วกว่านี้" };
  }
  const newEnd = `${String(Math.floor(newEndMin / 60)).padStart(2, "0")}:${String(newEndMin % 60).padStart(2, "0")}:00`;
  const newStart = parsed.data.start_time.length === 5
    ? `${parsed.data.start_time}:00`
    : parsed.data.start_time;

  // 2. กฎ delivery_mode ↔ room
  let nextMode = ev.delivery_mode;
  let nextRoom: string | null = parsed.data.room_id;
  if (ev.event_type === "class") {
    if (parsed.data.room_id === null) {
      // ลากไปแถว online → set delivery_mode='online'
      nextMode = "online";
    } else {
      // ลากไปห้อง → set delivery_mode='onsite' ถ้าเดิมเป็น online
      if (ev.delivery_mode === "online" || ev.delivery_mode == null) {
        nextMode = "onsite";
      }
    }
  }

  const { error } = await supabase
    .from("schedule_events")
    .update({
      day_of_week: parsed.data.day_of_week,
      start_time: newStart,
      end_time: newEnd,
      room_id: nextRoom,
      delivery_mode: nextMode,
    })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23P01") {
      return { ok: false, error: "ช่วงนี้ชนกับคลาส/ห้องอื่น", conflict: true };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/room-schedule");
  return { ok: true };
}

// ---------------------------------------------------------
// deleteEvent — hard delete
// ---------------------------------------------------------
export async function deleteEvent(fd: FormData): Promise<void> {
  if (checkEditPinFromForm(fd)) return; // silently no-op when locked
  const id = fd.get("id") as string;
  if (!id) return;
  const supabase = createServerSupabase();
  await supabase.from("schedule_events").delete().eq("id", id);
  revalidatePath("/admin/room-schedule");
  revalidatePath("/tutor/my-schedule");
}
