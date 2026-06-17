"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/service";
import { loadAvailability } from "@/lib/availability-service";
import type { TutorAvailability } from "@/lib/availability";
import type { DayOfWeek } from "@/lib/agents/types";

// ---------------------------------------------------------
// getBookingAvailability — ดึง slot ว่างให้หน้าเว็บ /book
// (same-origin server action → ไม่ต้องใช้ x-api-key, ไม่ leak key ออก client)
// ---------------------------------------------------------
export async function getBookingAvailability(
  subject: string,
  durationMin: number,
  days?: DayOfWeek[],
): Promise<{ ok: boolean; error?: string; tutors?: TutorAvailability[] }> {
  if (!subject.trim()) return { ok: false, error: "เลือกวิชาก่อน" };
  if (!Number.isFinite(durationMin) || durationMin < 30 || durationMin > 480) {
    return { ok: false, error: "จำนวนชั่วโมงไม่ถูกต้อง" };
  }
  try {
    const tutors = await loadAvailability({ subject: subject.trim(), durationMin, days });
    return { ok: true, tutors };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------------------------------------------------
// คำขอจอง (public — ผู้ปกครองส่งจากเว็บ /book; ไม่มี PIN gate)
// เขียนผ่าน service-role client → ทำงานได้แม้เปิด RLS + ไม่ปล่อย key ออก client
// line_user_id มาจาก hidden field ที่ LIFF getProfile() เซ็ต (ไม่ trust URL)
// ---------------------------------------------------------
const BookingInput = z.object({
  subject: z.string().trim().min(1, "เลือกวิชา"),
  grade_level: z.string().trim().max(8).optional().or(z.literal("")),
  duration_minutes: z.coerce.number().int().min(30).max(480),
  tutor_profile_id: z.string().uuid().optional().or(z.literal("")),
  tutor_name: z.string().trim().max(120).optional().or(z.literal("")),
  day_of_week: z.coerce.number().int().min(1).max(7),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "เวลาเริ่มไม่ถูก"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "เวลาจบไม่ถูก"),
  room_id: z.string().uuid().optional().or(z.literal("")),
  contact_name: z.string().trim().min(1, "ใส่ชื่อผู้ติดต่อ").max(120),
  contact_phone: z.string().trim().max(32).optional().or(z.literal("")),
  student_name: z.string().trim().max(120).optional().or(z.literal("")),
  line_user_id: z.string().trim().max(64).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type BookingFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof BookingInput>, string>>;
};

function flattenErrors(err: z.ZodError): BookingFormState["fieldErrors"] {
  const out: BookingFormState["fieldErrors"] = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof z.infer<typeof BookingInput>;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createBookingRequest(
  _prev: BookingFormState,
  fd: FormData,
): Promise<BookingFormState> {
  const input = {
    subject: (fd.get("subject") as string) || "",
    grade_level: (fd.get("grade_level") as string) || "",
    duration_minutes: (fd.get("duration_minutes") as string) || "",
    tutor_profile_id: (fd.get("tutor_profile_id") as string) || "",
    tutor_name: (fd.get("tutor_name") as string) || "",
    day_of_week: (fd.get("day_of_week") as string) || "",
    start_time: (fd.get("start_time") as string) || "",
    end_time: (fd.get("end_time") as string) || "",
    room_id: (fd.get("room_id") as string) || "",
    contact_name: (fd.get("contact_name") as string) || "",
    contact_phone: (fd.get("contact_phone") as string) || "",
    student_name: (fd.get("student_name") as string) || "",
    line_user_id: (fd.get("line_user_id") as string) || "",
    note: (fd.get("note") as string) || "",
  };

  const parsed = BookingInput.safeParse(input);
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ครบ/ไม่ถูกต้อง", fieldErrors: flattenErrors(parsed.error) };
  }
  const d = parsed.data;

  const supabase = createServiceSupabase();
  const { error } = await supabase.from("booking_requests").insert({
    subject: d.subject,
    grade_level: d.grade_level || null,
    duration_minutes: d.duration_minutes,
    tutor_profile_id: d.tutor_profile_id || null,
    tutor_name: d.tutor_name || null,
    day_of_week: d.day_of_week,
    start_time: d.start_time,
    end_time: d.end_time,
    room_id: d.room_id || null,
    contact_name: d.contact_name,
    contact_phone: d.contact_phone || null,
    student_name: d.student_name || null,
    line_user_id: d.line_user_id || null,
    note: d.note || null,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/booking-requests");
  return { ok: true };
}
