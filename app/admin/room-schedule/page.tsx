import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  Branch,
  Course,
  DayOfWeek,
  PendingBooking,
  Room,
  TutorProfile,
} from "@/lib/supabase/types";
import type { EventWithRelations } from "@/components/schedule-grid/EventBlock";
import { Toolbar, type ViewMode } from "@/components/schedule-grid/Toolbar";
import { DailyScheduleGrid } from "@/components/schedule-grid/DailyScheduleGrid";
import { WeeklyScheduleGrid } from "@/components/schedule-grid/WeeklyScheduleGrid";
import { WEEK_DAYS_TH_LONG } from "@/lib/time/week";

export const dynamic = "force-dynamic";

type SearchParams = {
  branch?: string;
  view?: string;
  dow?: string;
};

export default async function RoomSchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServerSupabase();
  const view: ViewMode = searchParams.view === "weekly" ? "weekly" : "daily";
  const dowParsed = Number(searchParams.dow);
  const dow: DayOfWeek =
    dowParsed >= 1 && dowParsed <= 7 ? (dowParsed as DayOfWeek) : currentDayOfWeek();

  // ---------------- branches ----------------
  const { data: branchesData, error: branchesError } = await supabase
    .from("branches")
    .select("*")
    .eq("active", true)
    .order("name_th");
  if (branchesError) return <ConnError detail={branchesError.message} />;
  const branches = (branchesData ?? []) as Branch[];
  if (branches.length === 0) {
    return (
      <EmptyShell title="ยังไม่มีสาขาในระบบ">
        ไป Supabase → SQL Editor → รัน <code>supabase/seed.sql</code> ก่อน
      </EmptyShell>
    );
  }

  const selectedBranchId =
    searchParams.branch && branches.find((b) => b.id === searchParams.branch)
      ? searchParams.branch
      : branches[0].id;

  // ---------------- rooms + events + pendings (parallel) ----------------
  // โหลด 3 query พร้อมกัน → ลดเวลาเทียบกับ sequential ~ 60–70%
  let eventsQuery = supabase
    .from("schedule_events")
    .select(
      `
      *,
      course:courses(id, title_th, default_color_hex),
      tutor:tutor_profiles(id, display_name_th, short_code, color_hex)
    `,
    )
    .eq("branch_id", selectedBranchId)
    .in("status", ["draft", "scheduled"]);

  if (view === "daily") {
    eventsQuery = eventsQuery.eq("day_of_week", dow);
  }
  eventsQuery = eventsQuery.order("day_of_week").order("start_time");

  const [roomsRes, eventsRes, pendingsRes, tutorsRes, coursesRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("*")
      .eq("branch_id", selectedBranchId)
      .eq("active", true)
      .order("sort_order")
      .order("code"),
    eventsQuery,
    supabase
      .from("pending_bookings")
      .select("*")
      .eq("branch_id", selectedBranchId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("tutor_profiles")
      .select("*")
      .eq("active", true)
      .order("display_name_th"),
    supabase
      .from("courses")
      .select("*")
      .eq("active", true)
      .order("title_th"),
  ]);

  if (roomsRes.error) return <ConnError detail={roomsRes.error.message} />;
  if (eventsRes.error) return <ConnError detail={eventsRes.error.message} />;

  const rooms = (roomsRes.data ?? []) as Room[];
  const events = (eventsRes.data ?? []) as EventWithRelations[];
  const pendings = (pendingsRes.data ?? []) as PendingBooking[];
  const tutors = (tutorsRes.data ?? []) as TutorProfile[];
  const courses = (coursesRes.data ?? []) as Course[];

  return (
    <main className="mx-auto max-w-[1700px] px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">
          หน้าแรก
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">ตารางห้องเรียน</span>
      </nav>

      <Toolbar
        view={view}
        dow={dow}
        branches={branches}
        selectedBranchId={selectedBranchId}
      />

      <div className="mt-6">
        {events.length === 0 && <EmptyState view={view} dow={dow} />}

        <div className={events.length === 0 ? "mt-4" : ""}>
          {view === "weekly" ? (
            <WeeklyScheduleGrid
              rooms={rooms}
              events={events}
              pendings={pendings}
              tutors={tutors}
              courses={courses}
            />
          ) : (
            <DailyScheduleGrid
              rooms={rooms}
              events={events}
              pendings={pendings}
              tutors={tutors}
              courses={courses}
              dayOfWeek={dow}
            />
          )}
        </div>
      </div>
    </main>
  );
}

// ----------------------------------------------------------------------

function currentDayOfWeek(): DayOfWeek {
  // วันนี้ใน Asia/Bangkok → ISO weekday (1=Mon..7=Sun)
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
  });
  const day = fmt.format(new Date());
  const map: Record<string, DayOfWeek> = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
    Friday: 5, Saturday: 6, Sunday: 7,
  };
  return map[day] ?? 1;
}

function EmptyState({ view, dow }: { view: ViewMode; dow: DayOfWeek }) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-800">
      {view === "daily"
        ? `ไม่มีคลาสในวัน${WEEK_DAYS_TH_LONG[dow - 1]}`
        : "ไม่มีคลาสในสัปดาห์"}
      {" "}— ลากการ์ดจากคลังรอจัดตาราง (หรือไปสร้างใหม่ที่{" "}
      <Link
        href="/admin/waiting-list"
        className="font-medium underline hover:text-amber-900"
      >
        คลังรอจัดตาราง
      </Link>
      )
    </div>
  );
}

function EmptyShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-3 text-gray-600">{children}</p>
    </main>
  );
}

function ConnError({ detail }: { detail: string }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold text-red-600">ยังต่อ Supabase ไม่ได้</h1>
      <p className="mt-3 text-gray-600">
        เช็คว่าใส่ค่าใน <code>.env.local</code> ครบ และรัน migrations + seed
        แล้วหรือยัง
      </p>
      <pre className="mt-6 overflow-x-auto rounded bg-gray-900 p-4 text-xs text-gray-100">
        {detail}
      </pre>
    </main>
  );
}
