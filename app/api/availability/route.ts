/**
 * GET /api/availability?subject=chem&durationMin=120&days=2,4&minCapacity=1
 *
 * Free teaching slots for a subject (tutor free + room free), with NO PII.
 * Called by the LINE chatbot (ซันจิ) via n8n to offer "ดีลคอร์สเดี่ยว"
 * times to parents, and reuses the SAME core (lib/availability) that the
 * phase-2 booking web page will use.
 *
 * Auth: header `x-api-key` must equal env AVAILABILITY_API_KEY.
 * DB:   server-only service client (lib/supabase/service) — works even
 *       after RLS is enabled, and never exposes a key to the caller.
 */
import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { computeAvailability, type AvailWorld } from "@/lib/availability";
import type { DayOfWeek } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // --- auth ---------------------------------------------------------------
  const expected = process.env.AVAILABILITY_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "availability API not configured (missing AVAILABILITY_API_KEY)" },
      { status: 503 },
    );
  }
  if (req.headers.get("x-api-key") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // --- params -------------------------------------------------------------
  const url = new URL(req.url);
  const subject = (url.searchParams.get("subject") ?? "").trim();
  const durationMin = Number(url.searchParams.get("durationMin") ?? "");
  if (!subject) {
    return NextResponse.json({ error: "missing ?subject" }, { status: 400 });
  }
  if (!Number.isFinite(durationMin) || durationMin < 30 || durationMin > 480) {
    return NextResponse.json(
      { error: "durationMin must be a number between 30 and 480" },
      { status: 400 },
    );
  }
  const daysParam = url.searchParams.get("days");
  const days = daysParam
    ? (daysParam
        .split(",")
        .map((d) => Number(d.trim()))
        .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7) as DayOfWeek[])
    : undefined;
  const minCapRaw = url.searchParams.get("minCapacity");
  const minCapacity = minCapRaw != null ? Number(minCapRaw) : undefined;

  // --- load world (only non-PII columns) ----------------------------------
  const supabase = createServiceSupabase();
  const [tutorsRes, roomsRes, eventsRes] = await Promise.all([
    supabase
      .from("tutor_profiles")
      .select("id,display_name_th,subjects,closed_days_for_new,active")
      .eq("active", true),
    supabase.from("rooms").select("id,name_th,capacity,active").eq("active", true),
    supabase
      .from("schedule_events")
      .select("tutor_profile_id,room_id,day_of_week,start_time,end_time,status,delivery_mode")
      .in("status", ["draft", "scheduled"])
      .limit(2000),
  ]);

  if (tutorsRes.error || roomsRes.error || eventsRes.error) {
    return NextResponse.json(
      {
        error:
          tutorsRes.error?.message ||
          roomsRes.error?.message ||
          eventsRes.error?.message,
      },
      { status: 500 },
    );
  }

  const world: AvailWorld = {
    tutors: (tutorsRes.data ?? []).map((t) => ({
      id: t.id as string,
      name: t.display_name_th as string,
      subjects: (t.subjects as string[] | null) ?? [],
      closedDaysForNew: ((t.closed_days_for_new as number[] | null) ?? []) as DayOfWeek[],
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

  const tutors = computeAvailability({ subject, durationMin, days, minCapacity }, world);

  return NextResponse.json({
    subject,
    durationMin,
    note: "slot = ว่างตามตารางคอร์สกลุ่ม (template รายสัปดาห์) · ครูยังไม่ยืนยันรับสอนเดี่ยว ต้องยืนยันกับครูก่อนปิดดีล · rooms = ห้องว่างตลอดช่วง · ไม่มี PII",
    tutors,
  });
}
