/**
 * GET /api/agents/snapshot
 *
 * Returns the current live snapshot (rooms / tutors / events / pendings)
 * shaped into the agent-layer domain types. Used by the demo panel's
 * "📥 เติมข้อมูลจริง" button so admins can run agents against real data
 * without copy-pasting JSON.
 *
 * Read-only — anon Supabase key, AdminGuard already gates the page that
 * calls this. PIN re-check would be redundant since the same data is
 * visible from /admin/room-schedule when unlocked.
 */

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  Deal,
  Room,
  ScheduleEvent,
  Tutor,
  DayOfWeek,
  DeliveryMode,
  TutorRole,
  EntityStatus,
  RoomType,
} from "@/lib/agents/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabase();

  const [roomsRes, tutorsRes, eventsRes, pendingsRes] = await Promise.all([
    supabase.from("rooms").select("*").eq("active", true).order("sort_order"),
    supabase.from("tutor_profiles").select("*").eq("active", true).order("display_name_th"),
    supabase
      .from("schedule_events")
      .select("*")
      .in("status", ["draft", "scheduled"])
      .limit(500),
    supabase
      .from("pending_bookings")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (roomsRes.error || tutorsRes.error || eventsRes.error || pendingsRes.error) {
    return NextResponse.json(
      {
        error:
          roomsRes.error?.message ||
          tutorsRes.error?.message ||
          eventsRes.error?.message ||
          pendingsRes.error?.message,
      },
      { status: 500 },
    );
  }

  const rooms: Room[] = (roomsRes.data ?? []).map((r): Room => ({
    id: r.id as string,
    name: r.name_th as string,
    capacity: r.capacity as number,
    equipment: (r.equipment as string[]) ?? [],
    status: (r.active ? "active" : "inactive") as EntityStatus,
    unavailableSlots: [],
    notes: r.location_note ?? null,
    code: r.code as string,
    building: r.building ?? null,
    roomType: r.room_type as RoomType,
    sortOrder: r.sort_order as number,
    branchId: r.branch_id as string,
  }));

  const tutors: Tutor[] = (tutorsRes.data ?? []).map((t): Tutor => ({
    id: t.id as string,
    name: t.display_name_th as string,
    shortCode: t.short_code as string,
    skills: (t.subjects as string[]) ?? [],
    availableSlots: [],
    unavailableSlots: [],
    maxHoursPerDay: 8,   // schema doesn't carry these yet
    maxHoursPerWeek: 30,
    status: (t.active ? "active" : "inactive") as EntityStatus,
    color: t.color_hex ?? null,
    role: "tutor" as TutorRole,
    branchId: t.branch_id ?? null,
  }));

  const events: ScheduleEvent[] = (eventsRes.data ?? []).map((e): ScheduleEvent => {
    const startMin = timeToMin(e.start_time);
    const endMin = timeToMin(e.end_time);
    return {
      id: e.id as string,
      dealId: null,
      courseId: e.course_id ?? null,
      roomId: e.room_id ?? null,
      tutorId: e.tutor_profile_id ?? null,
      title: e.title_th as string,
      date: null,
      dayOfWeek: e.day_of_week as DayOfWeek,
      startTime: e.start_time as string,
      endTime: e.end_time as string,
      durationMinutes: endMin - startMin,
      studentCount: e.planned_student_count ?? null,
      status: (e.status === "scheduled" ? "confirmed" : "draft") as ScheduleEvent["status"],
      source: "manual",
      createdBy: null,
      updatedBy: null,
      deliveryMode: (e.delivery_mode as DeliveryMode | null) ?? undefined,
    };
  });

  const deals: Deal[] = (pendingsRes.data ?? []).map((p): Deal => ({
    id: p.id as string,
    customerName: ((p.student_names as string[]) ?? []).join(", ") || p.title_th || "(ไม่ระบุ)",
    courseId: p.course_id ?? null,
    studentCount: p.planned_student_count ?? 1,
    preferredDays: [],
    preferredTimeRanges: [],
    startDate: null,
    endDate: null,
    durationMinutes: p.duration_minutes as number,
    requiredTutorSkills: [],
    roomRequirement: null,
    priority: "normal",
    status: "pending_schedule",
    notes: p.notes ?? null,
  }));

  return NextResponse.json({ rooms, tutors, events, deals });
}

function timeToMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}
