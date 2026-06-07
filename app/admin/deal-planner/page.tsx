import Link from "next/link";
import type { ReactNode } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  Branch,
  Course,
  DayOfWeek,
  DeliveryMode,
  Room,
  ScheduleEvent,
  TutorProfile,
} from "@/lib/supabase/types";
import { getEnrollmentCounts } from "@/lib/attendance-api";
import {
  SUBJECT_LIST,
  resolveEventColor,
  subjectLabel,
  type SubjectKey,
} from "@/lib/subject-colors";
import { WEEK_DAYS_TH_LONG, WEEK_DAYS_TH_SHORT } from "@/lib/time/week";
import { TutorClosedDaysEditor } from "@/components/tutors/TutorClosedDaysEditor";
import {
  SLOTS_PER_DAY,
  buildSlotLabels,
  eventSlotRange,
  shortHHMM,
} from "@/lib/time/grid";

export const dynamic = "force-dynamic";

type SearchParams = {
  branch?: string;
  subject?: string;
  day?: string;
  time?: string;
  mode?: string;
};

type DealMode = "any" | DeliveryMode;
type DayFilter = "all" | "weekday" | "weekend" | `${DayOfWeek}`;
type TimeFilter = "all" | "morning" | "afternoon" | "evening";
type TimeRange = [number, number];
type FreeRange = { startMin: number; endMin: number };

type EventCourse = Pick<
  Course,
  "id" | "title_th" | "course_code" | "subject" | "default_color_hex"
>;
type EventTutor = Pick<
  TutorProfile,
  "id" | "display_name_th" | "short_code" | "color_hex" | "subjects"
>;
type EventRoom = Pick<
  Room,
  "id" | "code" | "name_th" | "capacity" | "building"
>;

type DealEvent = ScheduleEvent & {
  course: EventCourse | null;
  tutor: EventTutor | null;
  room: EventRoom | null;
};

type SlotSuggestion = {
  tutor: TutorProfile;
  day: DayOfWeek;
  startMin: number;
  endMin: number;
  mode: "onsite" | "online" | "hybrid";
  room: Room | null;
};

const SLOT_DURATION_MINUTES = 90;
const TUTOR_DAY_COL_PX = 96;
const TUTOR_SLOT_PX = 46;
const TUTOR_HEADER_PX = 34;
const TUTOR_ROW_PX = 82;

const DAY_FILTERS: { value: DayFilter; label: string }[] = [
  { value: "all", label: "ทั้งสัปดาห์" },
  { value: "weekday", label: "จันทร์-ศุกร์" },
  { value: "weekend", label: "เสาร์-อาทิตย์" },
  { value: "1", label: "จันทร์" },
  { value: "2", label: "อังคาร" },
  { value: "3", label: "พุธ" },
  { value: "4", label: "พฤหัสบดี" },
  { value: "5", label: "ศุกร์" },
  { value: "6", label: "เสาร์" },
  { value: "7", label: "อาทิตย์" },
];

const TIME_FILTERS: { value: TimeFilter; label: string; ranges: [number, number][] }[] = [
  { value: "all", label: "08:00-23:00", ranges: [[8 * 60, 23 * 60]] },
  { value: "morning", label: "เช้า", ranges: [[8 * 60, 12 * 60]] },
  { value: "afternoon", label: "บ่าย", ranges: [[12 * 60, 17 * 60]] },
  { value: "evening", label: "เย็น", ranges: [[17 * 60, 23 * 60]] },
];

const MODE_FILTERS: { value: DealMode; label: string }[] = [
  { value: "any", label: "ทุกแบบ" },
  { value: "onsite", label: "Onsite" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

const SUBJECT_ALIASES: Record<SubjectKey, string[]> = {
  physics: ["physics", "phys", "ฟิสิกส์"],
  chem: ["chem", "chemistry", "เคมี"],
  bio: ["bio", "biology", "ชีวะ", "ชีววิทยา"],
  math: ["math", "คณิต"],
  science: ["science", "sci", "วิทย์", "วิทยาศาสตร์"],
  english: ["english", "eng", "อังกฤษ"],
};

export default async function DealPlannerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServerSupabase();

  const selectedSubject = parseSubject(searchParams.subject);
  const selectedDay = parseDayFilter(searchParams.day);
  const selectedTime = parseTimeFilter(searchParams.time);
  const selectedMode = parseMode(searchParams.mode);

  const [branchesQ, tutorsQ] = await Promise.all([
    supabase.from("branches").select("*").eq("active", true).order("name_th"),
    supabase
      .from("tutor_profiles")
      .select("*")
      .eq("active", true)
      .order("display_name_th"),
  ]);

  const firstError = branchesQ.error || tutorsQ.error;
  if (firstError) return <ConnError detail={firstError.message} />;

  const branches = (branchesQ.data ?? []) as Branch[];
  const allTutors = (tutorsQ.data ?? []) as TutorProfile[];

  if (branches.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-gray-900">ยังไม่มีสาขา</h1>
        <p className="mt-3 text-gray-600">
          รัน <code>supabase/seed.sql</code> ก่อน แล้วกลับมาดูหน้านี้อีกครั้ง
        </p>
      </main>
    );
  }

  const selectedBranchId =
    searchParams.branch && branches.some((b) => b.id === searchParams.branch)
      ? searchParams.branch
      : branches[0].id;

  const [eventsQ, roomsQ, coursesQ] = await Promise.all([
    supabase
      .from("schedule_events")
      .select(
        `
        *,
        course:courses(id, title_th, course_code, subject, default_color_hex),
        tutor:tutor_profiles(id, display_name_th, short_code, color_hex, subjects),
        room:rooms(id, code, name_th, capacity, building)
      `,
      )
      .eq("branch_id", selectedBranchId)
      .in("status", ["draft", "scheduled"])
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("rooms")
      .select("*")
      .eq("branch_id", selectedBranchId)
      .eq("active", true)
      .order("sort_order")
      .order("code"),
    supabase.from("courses").select("*").eq("active", true).order("title_th"),
  ]);

  const dataError = eventsQ.error || roomsQ.error || coursesQ.error;
  if (dataError) return <ConnError detail={dataError.message} />;

  const events = (eventsQ.data ?? []) as DealEvent[];
  const rooms = (roomsQ.data ?? []) as Room[];
  const courses = (coursesQ.data ?? []) as Course[];
  const branchTutors = allTutors.filter(
    (t) => !t.branch_id || t.branch_id === selectedBranchId,
  );

  const inferredTutorIds = new Set(
    events
      .filter((event) => event.tutor_profile_id && eventLooksLikeSubject(event, selectedSubject))
      .map((event) => event.tutor_profile_id as string),
  );

  const matchingTutors = branchTutors.filter(
    (tutor) =>
      tutor.subjects?.includes(selectedSubject) || inferredTutorIds.has(tutor.id),
  );
  const matchingTutorIds = new Set(matchingTutors.map((tutor) => tutor.id));

  const enrollmentCounts = await getEnrollmentCounts(events.map((event) => event.class_code));

  const visibleDays = getVisibleDays(selectedDay);
  const matchingTutorEvents = events.filter(
    (event) =>
      event.tutor_profile_id != null &&
      matchingTutorIds.has(event.tutor_profile_id) &&
      eventPassesFilters(event, selectedDay, selectedTime, selectedMode),
  );
  const availabilityTutorEvents = events.filter(
    (event) =>
      event.tutor_profile_id != null &&
      matchingTutorIds.has(event.tutor_profile_id) &&
      eventPassesFilters(event, selectedDay, selectedTime, "any"),
  );
  const subjectEvents = events.filter(
    (event) =>
      eventLooksLikeSubject(event, selectedSubject) &&
      eventPassesFilters(event, selectedDay, selectedTime, selectedMode),
  );

  const suggestions = buildSlotSuggestions({
    tutors: matchingTutors,
    rooms,
    events,
    dayFilter: selectedDay,
    timeFilter: selectedTime,
    mode: selectedMode,
  });

  const totalTutorHours = matchingTutors.reduce(
    (sum, tutor) => sum + tutorHours(events, tutor.id),
    0,
  );
  const selectedSubjectLabel = subjectLabel(selectedSubject);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-brand-600">
            หน้าแรก
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">ดีลคอร์สตามวิชา</span>
        </nav>

        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Course Deal Planner
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              ดีลคอร์สตามวิชา
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              เลือกวิชาแล้วดูติวเตอร์ที่สอนได้ ตารางปัจจุบัน slot ว่าง และจำนวนเด็กจริงจาก Attendance ในหน้าเดียว
            </p>
          </div>
          <Link
            href="/admin/room-schedule"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
          >
            เปิดตารางห้อง
          </Link>
        </header>

        <FilterBar
          branches={branches}
          selectedBranchId={selectedBranchId}
          selectedSubject={selectedSubject}
          selectedDay={selectedDay}
          selectedTime={selectedTime}
          selectedMode={selectedMode}
        />

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={`ติวเตอร์${selectedSubjectLabel}`}
            value={matchingTutors.length}
            suffix="คน"
            tone="emerald"
          />
          <MetricCard
            label="คลาสที่เห็นในตัวกรอง"
            value={matchingTutorEvents.length}
            suffix="คลาส"
            tone="amber"
          />
          <MetricCard
            label="slot แนะนำ"
            value={suggestions.length}
            suffix="ช่วง"
            tone="sky"
          />
          <MetricCard
            label="ชั่วโมงสอนของกลุ่มนี้"
            value={Number(totalTutorHours.toFixed(1))}
            suffix="ชม./สัปดาห์"
            tone="violet"
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card
            title={`ตารางติวเตอร์${selectedSubjectLabel}รายคน`}
            subtitle={`${matchingTutors.length} คน · เรียงรายติวเตอร์ · ${DAY_FILTERS.find((d) => d.value === selectedDay)?.label}`}
          >
            {matchingTutors.length === 0 ? (
              <EmptyPanel>
                ยังไม่พบติวเตอร์ที่ติดแท็กวิชานี้ หรือมีคลาสวิชานี้ในตาราง
              </EmptyPanel>
            ) : (
              <TutorRosterSchedules
                tutors={matchingTutors}
                events={availabilityTutorEvents}
                visibleDays={visibleDays}
                timeRanges={getTimeRanges(selectedTime)}
                enrollmentCounts={enrollmentCounts}
              />
            )}
          </Card>

          <Card
            title="slot ว่างแนะนำ"
            subtitle={`แสดงช่วงว่างที่ยาวพอเปิดคลาส ${SLOT_DURATION_MINUTES} นาทีขึ้นไป`}
          >
            {suggestions.length === 0 ? (
              <EmptyPanel>
                ยังไม่พบ slot ว่างในเงื่อนไขนี้ ลองเปลี่ยนวันหรือช่วงเวลา
              </EmptyPanel>
            ) : (
              <div className="space-y-3">
                <ul className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
                {suggestions.slice(0, 24).map((slot, index) => (
                  <li
                    key={`${slot.tutor.id}-${slot.day}-${slot.startMin}-${slot.mode}-${slot.room?.id ?? "online"}`}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {index + 1}. {slot.tutor.display_name_th}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {WEEK_DAYS_TH_LONG[slot.day - 1]} ·{" "}
                          {formatMin(slot.startMin)}-{formatMin(slot.endMin)}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                          ว่าง {formatDuration(slot.endMin - slot.startMin)}
                        </div>
                      </div>
                      <ModeBadge mode={slot.mode} />
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      {slotRoomText(slot)}
                    </div>
                  </li>
                ))}
              </ul>
                {suggestions.length > 24 && (
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                    ยังมีอีก {suggestions.length - 24} ช่วงตามเงื่อนไขนี้
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card
            title={`คลาส${selectedSubjectLabel}ที่อยู่ในระบบ`}
            subtitle="ใช้ไว้ดูว่าควรต่อยอดคลาสเดิมหรือเปิดดีลใหม่"
          >
            {subjectEvents.length === 0 ? (
              <EmptyPanel>ยังไม่มีคลาสในวิชานี้ตามตัวกรองปัจจุบัน</EmptyPanel>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {subjectEvents.slice(0, 12).map((event) => (
                  <EventSummaryCard
                    key={event.id}
                    event={event}
                    liveStudentCount={getLiveCount(enrollmentCounts, event)}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card title="ข้อมูลประกอบ" subtitle="ดึงจาก Supabase และ Attendance">
            <dl className="space-y-3 text-sm">
              <InfoRow label="คอร์สที่ active" value={`${courses.length} คอร์ส`} />
              <InfoRow label="ห้องที่ active" value={`${rooms.length} ห้อง`} />
              <InfoRow
                label="จำนวนเด็ก"
                value="ใช้ Attendance ก่อน ถ้าไม่มีใช้ planned"
              />
              <InfoRow
                label="แหล่งกรองติวเตอร์"
                value="subjects tag + คลาสจริงในตาราง"
              />
            </dl>
          </Card>
        </section>
      </div>
    </main>
  );
}

function FilterBar({
  branches,
  selectedBranchId,
  selectedSubject,
  selectedDay,
  selectedTime,
  selectedMode,
}: {
  branches: Branch[];
  selectedBranchId: string;
  selectedSubject: SubjectKey;
  selectedDay: DayFilter;
  selectedTime: TimeFilter;
  selectedMode: DealMode;
}) {
  return (
    <form className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-5">
        <SelectField label="วิชา">
          <select name="subject" defaultValue={selectedSubject} className={selectClassName}>
            {SUBJECT_LIST.map((subject) => (
              <option key={subject.key} value={subject.key}>
                {subject.label}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="สาขา">
          <select name="branch" defaultValue={selectedBranchId} className={selectClassName}>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name_th}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="วัน">
          <select name="day" defaultValue={selectedDay} className={selectClassName}>
            {DAY_FILTERS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="ช่วงเวลา">
          <select name="time" defaultValue={selectedTime} className={selectClassName}>
            {TIME_FILTERS.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="รูปแบบ">
          <select name="mode" defaultValue={selectedMode} className={selectClassName}>
            {MODE_FILTERS.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </SelectField>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {SUBJECT_LIST.map((subject) => (
            <SubjectQuickLink
              key={subject.key}
              subject={subject}
              selected={subject.key === selectedSubject}
              selectedBranchId={selectedBranchId}
              selectedDay={selectedDay}
              selectedTime={selectedTime}
              selectedMode={selectedMode}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/deal-planner"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            รีเซ็ต
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            ดูตาราง
          </button>
        </div>
      </div>
    </form>
  );
}

function SubjectQuickLink({
  subject,
  selected,
  selectedBranchId,
  selectedDay,
  selectedTime,
  selectedMode,
}: {
  subject: (typeof SUBJECT_LIST)[number];
  selected: boolean;
  selectedBranchId: string;
  selectedDay: DayFilter;
  selectedTime: TimeFilter;
  selectedMode: DealMode;
}) {
  const href =
    `/admin/deal-planner?subject=${subject.key}` +
    `&branch=${selectedBranchId}` +
    `&day=${selectedDay}` +
    `&time=${selectedTime}` +
    `&mode=${selectedMode}`;

  return (
    <Link
      href={href}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        selected
          ? "border-transparent text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
      ].join(" ")}
      style={selected ? { background: subject.color } : undefined}
    >
      {subject.label}
    </Link>
  );
}

function TutorRosterSchedules({
  tutors,
  events,
  visibleDays,
  timeRanges,
  enrollmentCounts,
}: {
  tutors: TutorProfile[];
  events: DealEvent[];
  visibleDays: DayOfWeek[];
  timeRanges: TimeRange[];
  enrollmentCounts: Map<string, number>;
}) {
  return (
    <CompactTutorScheduleTable
      tutors={tutors}
      events={events}
      visibleDays={visibleDays}
      timeRanges={timeRanges}
      enrollmentCounts={enrollmentCounts}
    />
  );

  const eventsByTutor = new Map<string, DealEvent[]>();
  for (const event of events) {
    const tutorId = event.tutor_profile_id;
    if (!tutorId) continue;
    const arr = eventsByTutor.get(tutorId as string) ?? [];
    arr.push(event);
    eventsByTutor.set(tutorId as string, arr);
  }

  for (const arr of eventsByTutor.values()) {
    arr.sort(
      (a, b) =>
        a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time),
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tutors.map((tutor) => {
          const tutorEvents = eventsByTutor.get(tutor.id) ?? [];
          return (
            <a
              key={tutor.id}
              href={`#tutor-${tutor.id}`}
              className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm transition hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-white shadow-sm"
                  style={{ background: tutor.color_hex ?? "#CBD5E1" }}
                />
                <span className="font-semibold text-gray-900">
                  {tutor.display_name_th}
                </span>
                <span className="text-xs text-gray-400">({tutor.short_code})</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {tutorEvents.length} คลาส · {tutorEventHours(tutorEvents).toFixed(1)} ชม./สัปดาห์
              </div>
            </a>
          );
        })}
      </div>

      {tutors.map((tutor) => (
        <TutorScheduleCard
          key={tutor.id}
          tutor={tutor}
          events={eventsByTutor.get(tutor.id) ?? []}
          visibleDays={visibleDays}
          enrollmentCounts={enrollmentCounts}
        />
      ))}
    </div>
  );
}

function CompactTutorScheduleTable({
  tutors,
  events,
  visibleDays,
  timeRanges,
  enrollmentCounts,
}: {
  tutors: TutorProfile[];
  events: DealEvent[];
  visibleDays: DayOfWeek[];
  timeRanges: TimeRange[];
  enrollmentCounts: Map<string, number>;
}) {
  const eventsByTutor = new Map<string, DealEvent[]>();
  const eventsByTutorDay = new Map<string, DealEvent[]>();

  for (const event of events) {
    if (!event.tutor_profile_id) continue;

    const tutorEvents = eventsByTutor.get(event.tutor_profile_id) ?? [];
    tutorEvents.push(event);
    eventsByTutor.set(event.tutor_profile_id, tutorEvents);

    const dayKey = `${event.tutor_profile_id}|${event.day_of_week}`;
    const dayEvents = eventsByTutorDay.get(dayKey) ?? [];
    dayEvents.push(event);
    eventsByTutorDay.set(dayKey, dayEvents);
  }

  for (const arr of eventsByTutor.values()) {
    arr.sort(
      (a, b) =>
        a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time),
    );
  }
  for (const arr of eventsByTutorDay.values()) {
    arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 w-[220px] rounded-tl-xl border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              ติวเตอร์
            </th>
            {visibleDays.map((day, index) => (
              <th
                key={day}
                className={[
                  "border-b border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs font-semibold text-gray-700",
                  index === visibleDays.length - 1 ? "rounded-tr-xl" : "",
                ].join(" ")}
              >
                {WEEK_DAYS_TH_SHORT[day - 1]}
                <div className="mt-0.5 font-normal text-gray-400">
                  {WEEK_DAYS_TH_LONG[day - 1]}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tutors.map((tutor) => {
            const tutorEvents = eventsByTutor.get(tutor.id) ?? [];
            const classCount = tutorEvents.filter(
              (event) => event.event_type === "class",
            ).length;
            const hours = tutorEventHours(tutorEvents);

            return (
              <tr key={tutor.id} className="group">
                <th className="sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-4 py-4 align-top group-hover:bg-gray-50">
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white shadow-sm"
                      style={{ background: tutor.color_hex ?? "#CBD5E1" }}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-900">
                        {tutor.display_name_th}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400">
                        {tutor.short_code} · {classCount} คลาส · {hours.toFixed(1)} ชม.
                      </div>
                      {tutor.subjects?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tutor.subjects.slice(0, 3).map((subject) => (
                            <span
                              key={subject}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                            >
                              {subjectLabel(subject)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </th>

                {visibleDays.map((day) => (
                  <TutorCompactDayCell
                    key={`${tutor.id}-${day}`}
                    tutorId={tutor.id}
                    day={day}
                    events={eventsByTutorDay.get(`${tutor.id}|${day}`) ?? []}
                    timeRanges={timeRanges}
                    enrollmentCounts={enrollmentCounts}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TutorCompactDayCell({
  tutorId,
  day,
  events,
  timeRanges,
  enrollmentCounts,
}: {
  tutorId: string;
  day: DayOfWeek;
  events: DealEvent[];
  timeRanges: TimeRange[];
  enrollmentCounts: Map<string, number>;
}) {
  const freeRanges = getFreeRangesForDay(events, timeRanges);
  const hiddenEventCount = Math.max(0, events.length - 3);
  const hiddenFreeCount = Math.max(0, freeRanges.length - 3);

  return (
    <td className="min-w-[170px] border-b border-gray-200 bg-white px-2 py-3 align-top group-hover:bg-gray-50">
      <div className="space-y-2">
        {events.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              คลาส
            </div>
            {events.slice(0, 3).map((event) => (
              <TutorBusyChip
                key={event.id}
                event={event}
                liveStudentCount={getLiveCount(enrollmentCounts, event)}
              />
            ))}
            {hiddenEventCount > 0 && (
              <div className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">
                +{hiddenEventCount} คลาส
              </div>
            )}
          </div>
        )}

        {freeRanges.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
              ว่าง
            </div>
            <div className="flex flex-wrap gap-1">
              {freeRanges.slice(0, 3).map((range) => (
                <FreeRangeBadge
                  key={`${tutorId}-${day}-${range.startMin}-${range.endMin}`}
                  range={range}
                />
              ))}
              {hiddenFreeCount > 0 && (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  +{hiddenFreeCount} ช่วง
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 px-2 py-2 text-center text-xs font-medium text-gray-400">
            ไม่มีช่วงว่าง 90 นาที+
          </div>
        )}
      </div>
    </td>
  );
}

function TutorBusyChip({
  event,
  liveStudentCount,
}: {
  event: DealEvent;
  liveStudentCount?: number;
}) {
  const color = resolveEventColor(
    event.title_th,
    [event.color_hex, event.course?.default_color_hex, event.tutor?.color_hex],
    "#CBD5E1",
  );
  const count =
    liveStudentCount ?? event.student_names?.length ?? event.planned_student_count;
  const roomText =
    event.delivery_mode === "online"
      ? "Online"
      : event.room
        ? `ห้อง ${event.room.code}`
        : "ยังไม่ระบุห้อง";

  return (
    <div
      className="rounded-lg border-l-4 bg-gray-50 px-2 py-1.5 text-[11px]"
      style={{ borderLeftColor: color }}
      title={`${event.title_th} (${shortHHMM(event.start_time)}-${shortHHMM(event.end_time)})`}
    >
      <div className="font-semibold text-gray-900">
        {shortHHMM(event.start_time)}-{shortHHMM(event.end_time)}
      </div>
      <div className="mt-0.5 truncate text-gray-700">{event.title_th}</div>
      <div className="mt-0.5 truncate text-gray-500">
        {roomText}
        {typeof count === "number" ? ` · ${count} คน` : ""}
      </div>
    </div>
  );
}

function FreeRangeBadge({ range }: { range: FreeRange }) {
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      {formatMin(range.startMin)}-{formatMin(range.endMin)}
    </span>
  );
}

function TutorScheduleCard({
  tutor,
  events,
  visibleDays,
  enrollmentCounts,
}: {
  tutor: TutorProfile;
  events: DealEvent[];
  visibleDays: DayOfWeek[];
  enrollmentCounts: Map<string, number>;
}) {
  const slotLabels = buildSlotLabels();
  const totalWidth = TUTOR_DAY_COL_PX + SLOTS_PER_DAY * TUTOR_SLOT_PX;
  const visibleDaySet = new Set(visibleDays);
  const visibleEvents = events.filter((event) =>
    visibleDaySet.has(event.day_of_week),
  );
  const classCount = visibleEvents.length;
  const hours = tutorEventHours(visibleEvents);
  const onlineCount = visibleEvents.filter(
    (event) => event.delivery_mode === "online",
  ).length;

  return (
    <article
      id={`tutor-${tutor.id}`}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-white shadow-sm"
              style={{ background: tutor.color_hex ?? "#CBD5E1" }}
            />
            <h3 className="text-base font-bold text-gray-900">
              {tutor.display_name_th}
            </h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500 ring-1 ring-gray-200">
              {tutor.short_code}
            </span>
          </div>
          {tutor.subjects?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tutor.subjects.map((subject) => (
                <span
                  key={subject}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200"
                >
                  {subjectLabel(subject)}
                </span>
              ))}
            </div>
          )}
          <TutorClosedDaysEditor tutor={tutor} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-right text-xs">
          <div>
            <div className="font-bold text-gray-900">{classCount}</div>
            <div className="text-gray-500">คลาส</div>
          </div>
          <div>
            <div className="font-bold text-gray-900">{hours.toFixed(1)}</div>
            <div className="text-gray-500">ชม.</div>
          </div>
          <div>
            <div className="font-bold text-gray-900">{onlineCount}</div>
            <div className="text-gray-500">online</div>
          </div>
        </div>
      </header>

      {visibleEvents.length === 0 ? (
        <div className="p-4">
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-6 text-center text-sm font-medium text-emerald-700">
            ยังไม่มีคลาสในตัวกรองนี้
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="relative"
            style={{
              display: "grid",
              gridTemplateColumns: `${TUTOR_DAY_COL_PX}px repeat(${SLOTS_PER_DAY}, ${TUTOR_SLOT_PX}px)`,
              gridTemplateRows: `${TUTOR_HEADER_PX}px repeat(${visibleDays.length}, ${TUTOR_ROW_PX}px)`,
              width: totalWidth,
            }}
          >
            <div
              className="sticky left-0 top-0 z-30 flex items-center justify-center border-b border-r border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500"
              style={{ gridRow: 1, gridColumn: 1 }}
            >
              วัน / เวลา
            </div>

            {slotLabels.map((label, index) => {
              const isHour = label.endsWith(":00");
              return (
                <div
                  key={`${tutor.id}-time-${label}`}
                  className="sticky top-0 z-20 flex items-end justify-center border-b border-gray-200 bg-gray-50 pb-1 text-[11px] font-semibold text-gray-700"
                  style={{ gridRow: 1, gridColumn: index + 2 }}
                >
                  {isHour ? label : ""}
                </div>
              );
            })}

            {visibleDays.map((day, index) => (
              <TutorDayGridRow
                key={`${tutor.id}-day-${day}`}
                row={index + 2}
                day={day}
                isClosed={(tutor.closed_days_for_new ?? []).includes(day)}
              />
            ))}

            {visibleEvents.map((event) => {
              const range = eventSlotRange(event.start_time, event.end_time);
              const rowIndex = visibleDays.indexOf(event.day_of_week);
              if (!range || rowIndex < 0) return null;
              return (
                <TimedEventCard
                  key={event.id}
                  event={event}
                  liveStudentCount={getLiveCount(enrollmentCounts, event)}
                  row={rowIndex + 2}
                  startSlot={range.startSlot}
                  span={range.span}
                />
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

function TutorDayGridRow({
  row,
  day,
  isClosed,
}: {
  row: number;
  day: DayOfWeek;
  isClosed?: boolean;
}) {
  return (
    <>
      <div
        className={[
          "sticky left-0 z-10 flex items-center justify-center border-b border-r border-gray-200 text-sm font-semibold",
          isClosed ? "bg-red-50 text-red-700" : "bg-white text-gray-900",
        ].join(" ")}
        style={{ gridRow: row, gridColumn: 1 }}
      >
        {isClosed ? "🚫 " : ""}
        {WEEK_DAYS_TH_LONG[day - 1]}
      </div>
      {Array.from({ length: SLOTS_PER_DAY }, (_, index) => (
        <div
          key={`day-bg-${row}-${index}`}
          className={[
            "border-b border-gray-100",
            isClosed
              ? index % 2 === 0
                ? "bg-red-50/40"
                : "bg-red-50/20"
              : index % 2 === 0
                ? "bg-gray-50/30"
                : "bg-white",
          ].join(" ")}
          style={{ gridRow: row, gridColumn: index + 2 }}
        />
      ))}
      {isClosed && (
        <div
          className="pointer-events-none flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-red-500"
          style={{
            gridRow: row,
            gridColumn: `2 / span ${SLOTS_PER_DAY}`,
          }}
        >
          ปิดรับคอร์สใหม่
        </div>
      )}
    </>
  );
}

function TimedEventCard({
  event,
  liveStudentCount,
  row,
  startSlot,
  span,
}: {
  event: DealEvent;
  liveStudentCount?: number;
  row: number;
  startSlot: number;
  span: number;
}) {
  const color = resolveEventColor(
    event.title_th,
    [event.color_hex, event.course?.default_color_hex, event.tutor?.color_hex],
    "#E5E7EB",
  );
  const count =
    liveStudentCount ?? event.student_names?.length ?? event.planned_student_count;
  const roomText =
    event.delivery_mode === "online"
      ? "Online"
      : event.room
        ? `ห้อง ${event.room.code}`
        : "ยังไม่ระบุห้อง";

  return (
    <div
      style={{
        gridRow: row,
        gridColumn: `${startSlot + 2} / span ${span}`,
        background: hexToBgTint(color),
        borderLeftColor: color,
        margin: "3px",
      }}
      className="relative flex flex-col justify-center overflow-hidden rounded-md border-l-4 px-2 py-1 text-[11px] transition hover:z-10 hover:shadow-md hover:ring-2 hover:ring-brand-300"
      title={`${event.title_th} (${shortHHMM(event.start_time)}-${shortHHMM(event.end_time)})`}
    >
      <div className="truncate font-semibold text-gray-900">{event.title_th}</div>
      <div className="truncate text-[10px] text-gray-600">
        {shortHHMM(event.start_time)}-{shortHHMM(event.end_time)}
        {typeof count === "number" ? ` · ${count} คน` : ""}
      </div>
      <div className="truncate text-[10px] text-gray-500">{roomText}</div>
    </div>
  );
}

function TutorScheduleTable({
  tutors,
  events,
  visibleDays,
  enrollmentCounts,
}: {
  tutors: TutorProfile[];
  events: DealEvent[];
  visibleDays: DayOfWeek[];
  enrollmentCounts: Map<string, number>;
}) {
  const eventsByTutorDay = new Map<string, DealEvent[]>();
  for (const event of events) {
    if (!event.tutor_profile_id) continue;
    const key = `${event.tutor_profile_id}|${event.day_of_week}`;
    const arr = eventsByTutorDay.get(key) ?? [];
    arr.push(event);
    eventsByTutorDay.set(key, arr);
  }
  for (const arr of eventsByTutorDay.values()) {
    arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-[920px] overflow-hidden rounded-xl border border-gray-200"
        style={{
          display: "grid",
          gridTemplateColumns: `180px repeat(${visibleDays.length}, minmax(150px, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          ติวเตอร์
        </div>
        {visibleDays.map((day) => (
          <div
            key={day}
            className="border-b border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs font-semibold text-gray-700"
          >
            {WEEK_DAYS_TH_SHORT[day - 1]}
            <div className="font-normal text-gray-400">
              {WEEK_DAYS_TH_LONG[day - 1]}
            </div>
          </div>
        ))}

        {tutors.map((tutor) => (
          <TutorRow
            key={tutor.id}
            tutor={tutor}
            visibleDays={visibleDays}
            eventsByTutorDay={eventsByTutorDay}
            enrollmentCounts={enrollmentCounts}
          />
        ))}
      </div>
    </div>
  );
}

function TutorRow({
  tutor,
  visibleDays,
  eventsByTutorDay,
  enrollmentCounts,
}: {
  tutor: TutorProfile;
  visibleDays: DayOfWeek[];
  eventsByTutorDay: Map<string, DealEvent[]>;
  enrollmentCounts: Map<string, number>;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 border-r border-t border-gray-200 bg-white px-3 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full border border-white shadow-sm"
            style={{ background: tutor.color_hex ?? "#CBD5E1" }}
          />
          <div>
            <div className="font-semibold text-gray-900">{tutor.display_name_th}</div>
            <div className="text-xs text-gray-400">{tutor.short_code}</div>
          </div>
        </div>
        {tutor.subjects?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tutor.subjects.slice(0, 3).map((subject) => (
              <span
                key={subject}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
              >
                {subjectLabel(subject)}
              </span>
            ))}
          </div>
        )}
      </div>

      {visibleDays.map((day) => {
        const dayEvents = eventsByTutorDay.get(`${tutor.id}|${day}`) ?? [];
        return (
          <div key={`${tutor.id}-${day}`} className="min-h-[118px] border-t border-gray-200 bg-white p-2">
            {dayEvents.length === 0 ? (
              <div className="flex h-full min-h-[90px] items-center justify-center rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 text-xs font-medium text-emerald-700">
                ว่าง
              </div>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <EventMiniCard
                    key={event.id}
                    event={event}
                    liveStudentCount={getLiveCount(enrollmentCounts, event)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function EventMiniCard({
  event,
  liveStudentCount,
}: {
  event: DealEvent;
  liveStudentCount?: number;
}) {
  const color = event.course?.default_color_hex ?? event.color_hex ?? "#E5E7EB";
  const count = liveStudentCount ?? event.student_names?.length ?? event.planned_student_count;
  const capacity = event.room?.capacity;
  const isOverCapacity =
    typeof count === "number" && typeof capacity === "number" && count > capacity;

  return (
    <div
      className="rounded-lg border-l-4 bg-gray-50 px-2.5 py-2 text-xs"
      style={{ borderLeftColor: color }}
    >
      <div className="font-semibold text-gray-900">
        {shortHHMM(event.start_time)}-{shortHHMM(event.end_time)}
      </div>
      <div className="mt-1 line-clamp-2 text-gray-700">{event.title_th}</div>
      <div className="mt-1 text-[11px] text-gray-500">
        {event.delivery_mode === "online"
          ? "Online"
          : event.room
            ? `${event.room.code}${event.room.building ? ` · ${event.room.building}` : ""}`
            : "ไม่ระบุห้อง"}
      </div>
      {typeof count === "number" && (
        <div
          className={[
            "mt-1 text-[11px] font-semibold",
            isOverCapacity ? "text-red-600" : "text-emerald-700",
          ].join(" ")}
        >
          {count} คน
          {capacity ? ` / จุ ${capacity}` : ""}
          {liveStudentCount !== undefined ? " · Attendance" : ""}
        </div>
      )}
    </div>
  );
}

function EventSummaryCard({
  event,
  liveStudentCount,
}: {
  event: DealEvent;
  liveStudentCount?: number;
}) {
  const count = liveStudentCount ?? event.student_names?.length ?? event.planned_student_count;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{event.title_th}</div>
          <div className="mt-1 text-xs text-gray-500">
            {WEEK_DAYS_TH_LONG[event.day_of_week - 1]} · {shortHHMM(event.start_time)}-
            {shortHHMM(event.end_time)}
          </div>
        </div>
        {event.delivery_mode && <ModeBadge mode={event.delivery_mode} />}
      </div>
      <div className="mt-2 grid gap-1 text-xs text-gray-600">
        <div>ครู: {event.tutor?.display_name_th ?? "ยังไม่ระบุ"}</div>
        <div>
          ห้อง:{" "}
          {event.delivery_mode === "online"
            ? "Online"
            : event.room
              ? `${event.room.code}${event.room.building ? ` · ${event.room.building}` : ""}`
              : "ยังไม่ระบุ"}
        </div>
        <div>
          นักเรียน:{" "}
          <span className="font-semibold text-emerald-700">
            {typeof count === "number" ? `${count} คน` : "ยังไม่ระบุ"}
          </span>
          {liveStudentCount !== undefined && (
            <span className="text-emerald-700"> · Attendance</span>
          )}
        </div>
        {event.class_code && <div className="font-mono text-[11px] text-gray-400">{event.class_code}</div>}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number;
  suffix: string;
  tone: "emerald" | "amber" | "sky" | "violet";
}) {
  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        <div className="text-sm font-medium">{suffix}</div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

function SelectField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="max-w-[190px] text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function ModeBadge({ mode }: { mode: DeliveryMode }) {
  const text =
    mode === "online" ? "Online" : mode === "hybrid" ? "Hybrid" : "Onsite";
  const className =
    mode === "online"
      ? "bg-sky-100 text-sky-700"
      : mode === "hybrid"
        ? "bg-violet-100 text-violet-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {text}
    </span>
  );
}

function ConnError({ detail }: { detail: string }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold text-red-600">โหลดข้อมูลไม่ได้</h1>
      <pre className="mt-6 overflow-x-auto rounded bg-gray-900 p-4 text-xs text-gray-100">
        {detail}
      </pre>
    </main>
  );
}

const selectClassName =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

function parseSubject(value: string | undefined): SubjectKey {
  return SUBJECT_LIST.some((subject) => subject.key === value)
    ? (value as SubjectKey)
    : "bio";
}

function parseDayFilter(value: string | undefined): DayFilter {
  if (DAY_FILTERS.some((day) => day.value === value)) return value as DayFilter;
  return "all";
}

function parseTimeFilter(value: string | undefined): TimeFilter {
  if (TIME_FILTERS.some((time) => time.value === value)) return value as TimeFilter;
  return "all";
}

function parseMode(value: string | undefined): DealMode {
  if (MODE_FILTERS.some((mode) => mode.value === value)) return value as DealMode;
  return "any";
}

function getVisibleDays(filter: DayFilter): DayOfWeek[] {
  if (filter === "weekday") return [1, 2, 3, 4, 5];
  if (filter === "weekend") return [6, 7];
  if (filter === "all") return [1, 2, 3, 4, 5, 6, 7];
  return [Number(filter) as DayOfWeek];
}

function getTimeRanges(filter: TimeFilter): [number, number][] {
  return TIME_FILTERS.find((time) => time.value === filter)?.ranges ?? TIME_FILTERS[0].ranges;
}

function eventPassesFilters(
  event: DealEvent,
  dayFilter: DayFilter,
  timeFilter: TimeFilter,
  mode: DealMode,
) {
  if (!getVisibleDays(dayFilter).includes(event.day_of_week)) return false;
  if (mode !== "any" && event.delivery_mode !== mode) return false;

  const start = timeToMin(event.start_time);
  const end = timeToMin(event.end_time);
  return getTimeRanges(timeFilter).some(([rangeStart, rangeEnd]) =>
    hasOverlap(start, end, rangeStart, rangeEnd),
  );
}

function eventLooksLikeSubject(event: DealEvent, subject: SubjectKey): boolean {
  const normalizedCourseSubject = normalizeSubject(event.course?.subject);
  if (normalizedCourseSubject === subject) return true;

  const haystack = [
    event.title_th,
    event.course?.title_th,
    event.course?.course_code,
    event.class_code,
    event.course?.subject,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return SUBJECT_ALIASES[subject].some((alias) => haystack.includes(alias.toLowerCase()));
}

function normalizeSubject(value: string | null | undefined): SubjectKey | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  for (const subject of SUBJECT_LIST) {
    if (subject.key === lower) return subject.key;
    if (SUBJECT_ALIASES[subject.key].some((alias) => lower === alias.toLowerCase())) {
      return subject.key;
    }
  }
  return null;
}

function buildSlotSuggestions({
  tutors,
  rooms,
  events,
  dayFilter,
  timeFilter,
  mode,
}: {
  tutors: TutorProfile[];
  rooms: Room[];
  events: DealEvent[];
  dayFilter: DayFilter;
  timeFilter: TimeFilter;
  mode: DealMode;
}): SlotSuggestion[] {
  const suggestions: SlotSuggestion[] = [];
  const days = getVisibleDays(dayFilter);
  const ranges = getTimeRanges(timeFilter);
  const sortedTutors = tutors
    .slice()
    .sort((a, b) => tutorHours(events, a.id) - tutorHours(events, b.id));

  for (const tutor of sortedTutors) {
    const closedSet = new Set(tutor.closed_days_for_new ?? []);
    for (const day of days) {
      // ครูปิดรับวันนี้ — ไม่ใส่ใน slot suggestion
      if (closedSet.has(day)) continue;
      const tutorDayEvents = events.filter(
        (event) =>
          event.tutor_profile_id === tutor.id &&
          event.day_of_week === day &&
          event.status !== "cancelled",
      );
      const freeRanges = getFreeRangesForDay(tutorDayEvents, ranges);

      for (const range of freeRanges) {
        const room =
          mode === "online"
            ? null
            : findAvailableRoom(rooms, events, day, range.startMin, range.endMin);
        const suggestionMode =
          mode === "any" ? (room ? "onsite" : "online") : mode;

        suggestions.push({
          tutor,
          day,
          startMin: range.startMin,
          endMin: range.endMin,
          mode: suggestionMode,
          room,
        });
      }
    }
  }

  return suggestions
    .sort(
      (a, b) =>
        a.day - b.day ||
        a.startMin - b.startMin ||
        b.endMin - b.startMin - (a.endMin - a.startMin) ||
        a.tutor.display_name_th.localeCompare(b.tutor.display_name_th),
    )
    .slice(0, 120);
}

function getFreeRangesForDay(
  dayEvents: DealEvent[],
  timeRanges: TimeRange[],
): FreeRange[] {
  const freeRanges: FreeRange[] = [];

  for (const [rangeStart, rangeEnd] of timeRanges) {
    const busyRanges = dayEvents
      .filter((event) => event.status !== "cancelled")
      .map((event) => ({
        startMin: Math.max(rangeStart, timeToMin(event.start_time)),
        endMin: Math.min(rangeEnd, timeToMin(event.end_time)),
      }))
      .filter((range) => range.startMin < range.endMin)
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    let cursor = rangeStart;
    for (const busy of busyRanges) {
      if (busy.startMin - cursor >= SLOT_DURATION_MINUTES) {
        freeRanges.push({ startMin: cursor, endMin: busy.startMin });
      }
      cursor = Math.max(cursor, busy.endMin);
    }

    if (rangeEnd - cursor >= SLOT_DURATION_MINUTES) {
      freeRanges.push({ startMin: cursor, endMin: rangeEnd });
    }
  }

  return freeRanges;
}

function findAvailableRoom(
  rooms: Room[],
  events: DealEvent[],
  day: DayOfWeek,
  start: number,
  end: number,
): Room | null {
  return (
    rooms.find(
      (room) =>
        !events.some(
          (event) =>
            event.room_id === room.id &&
            event.day_of_week === day &&
            event.status !== "cancelled" &&
            hasOverlap(start, end, timeToMin(event.start_time), timeToMin(event.end_time)),
        ),
    ) ?? null
  );
}

function isTutorBusy(
  events: DealEvent[],
  tutorId: string,
  day: DayOfWeek,
  start: number,
  end: number,
): boolean {
  return events.some(
    (event) =>
      event.tutor_profile_id === tutorId &&
      event.day_of_week === day &&
      event.status !== "cancelled" &&
      hasOverlap(start, end, timeToMin(event.start_time), timeToMin(event.end_time)),
  );
}

function tutorHours(events: DealEvent[], tutorId: string): number {
  return events
    .filter((event) => event.tutor_profile_id === tutorId && event.event_type === "class")
    .reduce(
      (sum, event) => sum + (timeToMin(event.end_time) - timeToMin(event.start_time)) / 60,
      0,
    );
}

function tutorEventHours(events: DealEvent[]): number {
  return events
    .filter((event) => event.event_type === "class")
    .reduce(
      (sum, event) => sum + (timeToMin(event.end_time) - timeToMin(event.start_time)) / 60,
      0,
    );
}

function getLiveCount(
  counts: Map<string, number>,
  event: Pick<DealEvent, "class_code">,
): number | undefined {
  return event.class_code ? counts.get(event.class_code) : undefined;
}

function hasOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function timeToMin(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function formatMin(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours} ชม. ${mins} นาที`;
  if (hours > 0) return `${hours} ชม.`;
  return `${mins} นาที`;
}

function slotRoomText(slot: SlotSuggestion): string {
  if (slot.room) {
    return `ห้อง ${slot.room.code}${
      slot.room.building ? ` · ${slot.room.building}` : ""
    } · จุ ${slot.room.capacity} คน`;
  }
  if (slot.mode === "online") return "ออนไลน์ / ไม่ใช้ห้องเรียน";
  return "ครูว่างช่วงนี้ · ต้องเช็กห้องเป็นช่วงย่อย";
}

function hexToBgTint(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#F9FAFB";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * 0.3 + 255 * 0.7);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
