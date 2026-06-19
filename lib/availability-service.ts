import "server-only";
import { createServiceSupabase } from "@/lib/supabase/service";
import {
  computeAvailability,
  type AvailWorld,
  type AvailabilityParams,
  type TutorAvailability,
} from "@/lib/availability";
import type { DayOfWeek } from "@/lib/agents/types";

/**
 * Server-only: โหลด world จาก Supabase (service-role, เลือกเฉพาะ column ที่ไม่ใช่ PII)
 * แล้วรัน computeAvailability. ใช้ร่วมกัน 2 ทาง:
 *   1. GET /api/availability   (บอท ซันจิ — auth ด้วย x-api-key ที่ route)
 *   2. server action getBookingAvailability (เว็บหน้าจอง /book — same-origin, ไม่ต้องใช้ key)
 *
 * → logic เดียว, ออก slot เดียวกันทั้ง 2 ที่ (ไม่มี PII ในผลลัพธ์)
 */
export async function loadAvailability(
  params: AvailabilityParams,
): Promise<TutorAvailability[]> {
  const supabase = createServiceSupabase();
  const [tutorsRes, roomsRes, eventsRes, blackoutsRes] = await Promise.all([
    supabase
      .from("tutor_profiles")
      .select("id,display_name_th,subjects,closed_days_for_new,accepts_new_private,active")
      .eq("active", true),
    supabase.from("rooms").select("id,name_th,capacity,active").eq("active", true),
    supabase
      .from("schedule_events")
      .select("tutor_profile_id,room_id,day_of_week,start_time,end_time,status,delivery_mode")
      .in("status", ["draft", "scheduled"])
      .limit(2000),
    // blackout windows — ถ้าตารางยังไม่มี (ก่อนรัน migration 0017) จะ error เฉย ๆ
    // ไม่ทำให้ availability พัง (จัดการแบบ defensive ด้านล่าง)
    supabase
      .from("tutor_blackout_windows")
      .select("tutor_profile_id,day_of_week,start_time,end_time"),
  ]);

  const err = tutorsRes.error || roomsRes.error || eventsRes.error;
  if (err) throw new Error(err.message);

  // group blackout windows by tutor (defensive: query error → ไม่มี blackout)
  const blackoutsByTutor = new Map<
    string,
    { dayOfWeek: DayOfWeek; start: string; end: string }[]
  >();
  if (!blackoutsRes.error) {
    for (const b of blackoutsRes.data ?? []) {
      const key = b.tutor_profile_id as string;
      const arr = blackoutsByTutor.get(key) ?? [];
      arr.push({
        dayOfWeek: b.day_of_week as DayOfWeek,
        start: b.start_time as string,
        end: b.end_time as string,
      });
      blackoutsByTutor.set(key, arr);
    }
  }

  const world: AvailWorld = {
    tutors: (tutorsRes.data ?? []).map((t) => ({
      id: t.id as string,
      name: t.display_name_th as string,
      subjects: (t.subjects as string[] | null) ?? [],
      closedDaysForNew: ((t.closed_days_for_new as number[] | null) ?? []) as DayOfWeek[],
      acceptsPrivate: (t.accepts_new_private as boolean | null) ?? true,
      blackouts: blackoutsByTutor.get(t.id as string) ?? [],
    })),
    rooms: (roomsRes.data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name_th as string,
      capacity: r.capacity as number,
    })),
    events: (eventsRes.data ?? []).map((e) => ({
      tutorId: (e.tutor_profile_id as string | null) ?? null,
      roomId: (e.room_id as string | null) ?? null,
      dayOfWeek: e.day_of_week as DayOfWeek,
      startTime: e.start_time as string,
      endTime: e.end_time as string,
      status: e.status as string,
      deliveryMode: (e.delivery_mode as string | null) ?? null,
    })),
  };

  return computeAvailability(params, world);
}
