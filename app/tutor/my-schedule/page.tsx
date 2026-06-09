import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Course, Room, TutorProfile } from "@/lib/supabase/types";
import type { EventWithRelations } from "@/components/schedule-grid/EventBlock";
import { TutorScheduleGrid } from "@/components/tutor/TutorScheduleGrid";

export const dynamic = "force-dynamic";

type SearchParams = {
  tutor?: string;
};

export default async function MySchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServerSupabase();

  // 1. โหลดติวเตอร์ทั้งหมด (ยังไม่มี auth → เลือกเอง)
  const { data: tutorsData, error: tutorsError } = await supabase
    .from("tutor_profiles")
    .select("*")
    .eq("active", true)
    .order("display_name_th");

  if (tutorsError) return <ErrorPage msg={tutorsError.message} />;
  const tutors = (tutorsData ?? []) as TutorProfile[];

  if (tutors.length === 0) {
    return (
      <Shell title="ยังไม่มีติวเตอร์ในระบบ">
        เพิ่มข้อมูลใน <code>tutor_profiles</code> ก่อน หรือรัน seed.sql
      </Shell>
    );
  }

  const selectedTutorId =
    searchParams.tutor && tutors.find((t) => t.id === searchParams.tutor)
      ? searchParams.tutor
      : tutors[0].id;
  const selectedTutor = tutors.find((t) => t.id === selectedTutorId)!;

  // 2. โหลด events ของ tutor (template ทั้งหมด)
  const { data: eventsData, error: eventsError } = await supabase
    .from("schedule_events")
    .select(
      `
      *,
      course:courses(id, title_th, default_color_hex),
      tutor:tutor_profiles(id, display_name_th, short_code, color_hex),
      room:rooms(id, code, name_th, capacity)
    `,
    )
    .eq("event_type", "class")
    .eq("tutor_profile_id", selectedTutorId)
    .in("status", ["draft", "scheduled"])
    .order("day_of_week")
    .order("start_time");

  if (eventsError) return <ErrorPage msg={eventsError.message} />;
  const events = (eventsData ?? []) as EventWithRelations[];

  // 3. Rooms + courses — needed by EventDrawer for in-place edits
  const [roomsRes, coursesRes] = await Promise.all([
    supabase.from("rooms").select("*").eq("active", true).order("sort_order").order("code"),
    supabase.from("courses").select("*").eq("active", true).order("title_th"),
  ]);
  const rooms = (roomsRes.data ?? []) as Room[];
  const courses = (coursesRes.data ?? []) as Course[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">หน้าแรก</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">ตารางสอนของฉัน</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        ตารางสอนประจำสัปดาห์ของ {selectedTutor.display_name_th}
      </h1>
      <p className="mb-5 text-sm text-gray-500">
        คลาสที่ต้อง repeat ทุกสัปดาห์ (ยังไม่มี auth — เลือกติวเตอร์เองได้)
      </p>

      <TutorScheduleGrid
        tutors={tutors}
        selectedTutorId={selectedTutorId}
        events={events}
        rooms={rooms}
        courses={courses}
      />
    </main>
  );
}

function ErrorPage({ msg }: { msg: string }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold text-red-600">โหลดข้อมูลไม่ได้</h1>
      <pre className="mt-4 overflow-x-auto rounded bg-gray-900 p-4 text-xs text-gray-100">
        {msg}
      </pre>
    </main>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-3 text-gray-600">{children}</p>
    </main>
  );
}
