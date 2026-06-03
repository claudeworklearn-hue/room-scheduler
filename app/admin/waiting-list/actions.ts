"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkEditPin, checkEditPinFromForm } from "@/lib/edit-pin";

// ---------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------
const DELIVERY = z.enum(["onsite", "online", "hybrid"]);
const CODE_PREFIX = z.enum(["PV", "GR", "CM", "IN"]);
const GRADE_LEVEL = z.enum([
  "P1","P2","P3","P4","P5","P6",
  "M1","M2","M3","M4","M5","M6",
  "ETC",
]);

const PendingInput = z.object({
  branch_id: z.string().uuid(),
  course_id: z.string().uuid().nullable().optional(),
  tutor_profile_id: z.string().uuid().nullable().optional(),
  title_th: z.string().trim().min(1, "ใส่ชื่อคลาส").max(200),
  code_prefix: CODE_PREFIX,
  grade_level: GRADE_LEVEL,
  duration_minutes: z.coerce.number().int().min(30, "อย่างน้อย 30 นาที").max(480, "ไม่เกิน 8 ชั่วโมง"),
  planned_student_count: z
    .union([z.coerce.number().int().positive(), z.literal("").transform(() => null)])
    .nullable()
    .optional(),
  delivery_mode: DELIVERY,
  color_hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "สีต้องเป็น hex (#RRGGBB)")
    .nullable()
    .or(z.literal("").transform(() => null))
    .optional(),
  notes: z.string().nullable().or(z.literal("").transform(() => null)).optional(),
  student_names: z
    .array(z.string().trim().min(1).max(60))
    .max(50, "เกิน 50 ชื่อใน 1 ดีล")
    .default([]),
});

export type PendingFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof PendingInput>, string>>;
};

function flattenErrors(err: z.ZodError): PendingFormState["fieldErrors"] {
  const out: PendingFormState["fieldErrors"] = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof z.infer<typeof PendingInput>;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function fdToInput(fd: FormData) {
  const tutor = fd.get("tutor_profile_id") as string | null;
  const course = fd.get("course_id") as string | null;

  // student_names ส่งมาเป็น JSON string ผ่าน hidden input (ง่ายกว่า multi-input)
  let studentNames: string[] = [];
  const rawNames = fd.get("student_names") as string | null;
  if (rawNames) {
    try {
      const parsed = JSON.parse(rawNames);
      if (Array.isArray(parsed)) {
        studentNames = parsed
          .map((s) => String(s).trim())
          .filter((s) => s.length > 0);
      }
    } catch {
      // ปล่อยให้เป็น array ว่าง — Zod จะ accept default []
    }
  }

  return {
    branch_id: fd.get("branch_id") as string,
    course_id: course && course !== "" ? course : null,
    tutor_profile_id: tutor && tutor !== "" ? tutor : null,
    title_th: fd.get("title_th") as string,
    code_prefix: (fd.get("code_prefix") as string) || "PV",
    grade_level: (fd.get("grade_level") as string) || "M4",
    duration_minutes: fd.get("duration_minutes") as string,
    planned_student_count: (fd.get("planned_student_count") as string) || "",
    delivery_mode: (fd.get("delivery_mode") as string) || "onsite",
    color_hex: (fd.get("color_hex") as string) || "",
    notes: (fd.get("notes") as string) || "",
    student_names: studentNames,
  };
}

// ---------------------------------------------------------
// createPending
// ---------------------------------------------------------
export async function createPending(
  _prev: PendingFormState,
  fd: FormData,
): Promise<PendingFormState> {
  const pinErr = checkEditPinFromForm(fd);
  if (pinErr) return { error: pinErr };

  const parsed = PendingInput.safeParse(fdToInput(fd));
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง", fieldErrors: flattenErrors(parsed.error) };
  }
  const supabase = createServerSupabase();
  const { error } = await supabase.from("pending_bookings").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/waiting-list");
  revalidatePath("/admin/room-schedule");
  return { ok: true };
}

// ---------------------------------------------------------
// updatePending — ต้องส่ง id
// ---------------------------------------------------------
export async function updatePending(
  _prev: PendingFormState,
  fd: FormData,
): Promise<PendingFormState> {
  const pinErr = checkEditPinFromForm(fd);
  if (pinErr) return { error: pinErr };

  const id = fd.get("id") as string;
  if (!id) return { error: "ไม่พบรหัสรายการที่จะแก้ไข" };

  const parsed = PendingInput.safeParse(fdToInput(fd));
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง", fieldErrors: flattenErrors(parsed.error) };
  }
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("pending_bookings")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/waiting-list");
  revalidatePath("/admin/room-schedule");
  return { ok: true };
}

// ---------------------------------------------------------
// deletePending (จริง ๆ คือ mark cancelled แต่จะ delete ตรง ๆ ก็ได้)
// ---------------------------------------------------------
export async function deletePending(formData: FormData): Promise<void> {
  if (checkEditPinFromForm(formData)) return;
  const id = formData.get("id") as string;
  if (!id) return;
  const supabase = createServerSupabase();
  await supabase.from("pending_bookings").delete().eq("id", id);
  revalidatePath("/admin/waiting-list");
  revalidatePath("/admin/room-schedule");
}

// ---------------------------------------------------------
// schedulePendingToEvent — ใช้ตอนลาก-วาง การ์ดบน grid
// สร้าง schedule_events (template) + mark pending เป็น scheduled
//
// คืนค่า { ok, error?, eventId? } เพื่อให้ frontend แสดง toast/feedback
// ---------------------------------------------------------
const ScheduleInput = z.object({
  pending_id: z.string().uuid(),
  room_id: z.string().uuid().nullable(),
  day_of_week: z.coerce.number().int().min(1).max(7),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "เวลาเริ่มต้นไม่ถูก format"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "เวลาจบไม่ถูก format"),
  override_title: z.string().trim().min(1).optional(),
  pin: z.string().optional(),
});

export type ScheduleFromPendingResult = {
  ok: boolean;
  error?: string;
  conflict?: boolean;
  eventId?: string;
};

export async function schedulePendingToEvent(
  input: z.infer<typeof ScheduleInput>,
): Promise<ScheduleFromPendingResult> {
  const pinErr = checkEditPin(input.pin);
  if (pinErr) return { ok: false, error: pinErr };

  const parsed = ScheduleInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const { pending_id, room_id, day_of_week, start_time, end_time, override_title } = parsed.data;

  // เติม :00 ถ้าไม่มี seconds
  const startT = start_time.length === 5 ? `${start_time}:00` : start_time;
  const endT = end_time.length === 5 ? `${end_time}:00` : end_time;
  if (endT <= startT) {
    return { ok: false, error: "เวลาจบต้องมากกว่าเวลาเริ่ม" };
  }

  const supabase = createServerSupabase();

  // 1. โหลด pending booking
  const { data: pending, error: pErr } = await supabase
    .from("pending_bookings")
    .select("*")
    .eq("id", pending_id)
    .maybeSingle();
  if (pErr) return { ok: false, error: pErr.message };
  if (!pending) return { ok: false, error: "ไม่พบรายการในคลังรอจัดตาราง" };
  if (pending.status !== "pending") {
    return { ok: false, error: "รายการนี้ถูกจัดตาราง/ยกเลิกไปแล้ว" };
  }

  // 2. กฎ delivery_mode ↔ room
  const mode = pending.delivery_mode;
  if (mode === "online" && room_id !== null) {
    return { ok: false, error: "คลาสออนไลน์ต้องไม่ระบุห้อง" };
  }
  if ((mode === "onsite" || mode === "hybrid") && !room_id) {
    return { ok: false, error: "คลาส onsite/hybrid ต้องระบุห้อง" };
  }

  // 3. สร้าง schedule_events (DB exclusion constraint จะ reject ถ้าชน)
  const { data: inserted, error: insErr } = await supabase
    .from("schedule_events")
    .insert({
      branch_id: pending.branch_id,
      event_type: "class",
      title_th: override_title || pending.title_th,
      course_id: pending.course_id,
      tutor_profile_id: pending.tutor_profile_id,
      room_id,
      delivery_mode: pending.delivery_mode,
      day_of_week,
      start_time: startT,
      end_time: endT,
      planned_student_count: pending.planned_student_count,
      status: "scheduled",
      color_hex: pending.color_hex,
      source_type: "manual",
      source_ref: `pending:${pending.id}`,
      notes: pending.notes,
    })
    .select("id")
    .single();

  if (insErr) {
    // PostgreSQL exclusion_violation = 23P01
    if (insErr.code === "23P01") {
      const detail = await describeConflict(
        supabase,
        day_of_week,
        startT,
        endT,
        room_id,
        pending.tutor_profile_id,
      );
      return {
        ok: false,
        conflict: true,
        error: detail
          ? `ชนกับ: ${detail}`
          : "ช่วงเวลานี้ชนกับคลาส/ห้องที่จองไว้แล้ว",
      };
    }
    return { ok: false, error: insErr.message };
  }

  // 4. mark pending เป็น scheduled + link ไป event ที่สร้าง
  await supabase
    .from("pending_bookings")
    .update({ status: "scheduled", scheduled_event_id: inserted.id })
    .eq("id", pending.id);

  revalidatePath("/admin/waiting-list");
  revalidatePath("/admin/room-schedule");

  return { ok: true, eventId: inserted.id };
}

// ---------------------------------------------------------
// describeConflict — หา event ที่ทับเวลาเพื่อตอบ user ว่า "ชน" คือกับคลาสไหน
// match กับ room conflict หรือ tutor conflict (อันใดอันหนึ่ง)
// ---------------------------------------------------------
async function describeConflict(
  supabase: ReturnType<typeof createServerSupabase>,
  dow: number,
  startT: string,
  endT: string,
  roomId: string | null,
  tutorId: string | null,
): Promise<string | null> {
  const conds: string[] = [];
  if (roomId) conds.push(`room_id.eq.${roomId}`);
  if (tutorId) conds.push(`tutor_profile_id.eq.${tutorId}`);
  if (conds.length === 0) return null;

  const { data } = await supabase
    .from("schedule_events")
    .select(
      "title_th,start_time,end_time,room:rooms(code),tutor:tutor_profiles(display_name_th)",
    )
    .eq("day_of_week", dow)
    .in("status", ["draft", "scheduled"])
    .lt("start_time", endT)
    .gt("end_time", startT)
    .or(conds.join(","));

  if (!data || data.length === 0) return null;
  const e = data[0] as {
    title_th: string;
    start_time: string;
    end_time: string;
    room?: { code?: string | null } | null;
    tutor?: { display_name_th?: string | null } | null;
  };
  const time = `${e.start_time.slice(0, 5)}-${e.end_time.slice(0, 5)}`;
  const where = e.room?.code ? ` ห้อง ${e.room.code}` : "";
  const who = e.tutor?.display_name_th ? ` ${e.tutor.display_name_th}` : "";
  return `"${e.title_th}" (${time})${where}${who}`;
}
