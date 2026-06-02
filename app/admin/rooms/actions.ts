"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

// ---------------------------------------------------------
// Zod schema สำหรับฟอร์มสร้าง/แก้ไขห้อง
// ---------------------------------------------------------
const RoomInput = z.object({
  branch_id: z.string().uuid("เลือกสาขาก่อน"),
  building: z.string().trim().max(64).optional().or(z.literal("")),
  code: z
    .string()
    .trim()
    .min(1, "ใส่รหัสห้อง")
    .max(16, "รหัสห้องยาวเกิน 16 ตัวอักษร"),
  name_th: z
    .string()
    .trim()
    .min(1, "ใส่ชื่อห้องภาษาไทย")
    .max(120, "ชื่อห้องยาวเกิน 120 ตัวอักษร"),
  name_en: z.string().trim().max(120).optional().or(z.literal("")),
  capacity: z.coerce
    .number()
    .int("ความจุต้องเป็นจำนวนเต็ม")
    .positive("ความจุต้องมากกว่า 0")
    .max(500, "ความจุไม่ควรเกิน 500"),
  room_type: z.enum(["classroom", "lab", "meeting", "studio", "other"]),
  location_note: z.string().trim().max(255).optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(9999),
  active: z.coerce.boolean(),
});

export type RoomFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof RoomInput>, string>>;
};

const EMPTY: RoomFormState = {};

// ---------------------------------------------------------
// helper: รวม fieldErrors จาก Zod
// ---------------------------------------------------------
function flattenErrors(err: z.ZodError): RoomFormState["fieldErrors"] {
  const out: RoomFormState["fieldErrors"] = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof z.infer<typeof RoomInput>;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

// ---------------------------------------------------------
// แปลง FormData → object (ค่าที่ว่างให้เป็น undefined)
// ---------------------------------------------------------
function fdToInput(fd: FormData) {
  return {
    branch_id: fd.get("branch_id") as string,
    building: (fd.get("building") as string) || "",
    code: fd.get("code") as string,
    name_th: fd.get("name_th") as string,
    name_en: fd.get("name_en") as string,
    capacity: fd.get("capacity") as string,
    room_type: fd.get("room_type") as string,
    location_note: fd.get("location_note") as string,
    sort_order: (fd.get("sort_order") as string) || "0",
    active: fd.get("active") === "on" || fd.get("active") === "true",
  };
}

// ---------------------------------------------------------
// createRoom
// ---------------------------------------------------------
export async function createRoom(
  _prev: RoomFormState,
  fd: FormData,
): Promise<RoomFormState> {
  const parsed = RoomInput.safeParse(fdToInput(fd));
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง", fieldErrors: flattenErrors(parsed.error) };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.from("rooms").insert({
    ...parsed.data,
    building: parsed.data.building || null,
    name_en: parsed.data.name_en || null,
    location_note: parsed.data.location_note || null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "รหัสห้องนี้มีอยู่แล้วในสาขานี้",
        fieldErrors: { code: "รหัสซ้ำ" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/admin/room-schedule");
  return { ok: true };
}

// ---------------------------------------------------------
// updateRoom — ต้องส่ง id มาด้วยใน FormData
// ---------------------------------------------------------
export async function updateRoom(
  _prev: RoomFormState,
  fd: FormData,
): Promise<RoomFormState> {
  const id = fd.get("id") as string;
  if (!id) return { error: "ไม่พบรหัสห้องที่จะแก้ไข" };

  const parsed = RoomInput.safeParse(fdToInput(fd));
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง", fieldErrors: flattenErrors(parsed.error) };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("rooms")
    .update({
      ...parsed.data,
      name_en: parsed.data.name_en || null,
      location_note: parsed.data.location_note || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "รหัสห้องนี้มีอยู่แล้วในสาขานี้",
        fieldErrors: { code: "รหัสซ้ำ" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/admin/room-schedule");
  return { ok: true };
}

// ---------------------------------------------------------
// toggleRoomActive — toggle active flag (soft hide/show)
// ---------------------------------------------------------
export async function toggleRoomActive(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  const next = formData.get("active") === "true";
  if (!id) return;

  const supabase = createServerSupabase();
  await supabase.from("rooms").update({ active: next }).eq("id", id);
  revalidatePath("/admin/rooms");
  revalidatePath("/admin/room-schedule");
}

export const INITIAL_FORM_STATE: RoomFormState = EMPTY;
