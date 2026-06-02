import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  DayOfWeek,
  Room,
  TutorProfile,
} from "@/lib/supabase/types";
import type { EventWithRelations } from "@/components/schedule-grid/EventBlock";
import { WEEK_DAYS_TH_SHORT } from "@/lib/time/week";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function timeToMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function eventDurationHours(ev: { start_time: string; end_time: string }): number {
  return (timeToMin(ev.end_time) - timeToMin(ev.start_time)) / 60;
}

function detectSubject(title: string): string {
  if (title.includes("ฟิสิกส์") || title.includes("ฟิสิก")) return "ฟิสิกส์";
  if (title.includes("เคมี")) return "เคมี";
  if (title.includes("ชีวะ") || /Bio|BIO/.test(title)) return "ชีวะ";
  if (title.includes("คณิต") || /MATH/.test(title)) return "คณิต";
  if (title.includes("วิทย์")) return "วิทย์";
  if (title.includes("อังกฤษ") || /English/i.test(title)) return "อังกฤษ";
  return "อื่น ๆ";
}

const SUBJECT_COLOR: Record<string, string> = {
  ฟิสิกส์: "#FBBF24",
  เคมี: "#6EE7B7",
  ชีวะ: "#86EFAC",
  คณิต: "#A78BFA",
  วิทย์: "#FCA5A5",
  อังกฤษ: "#93C5FD",
  "อื่น ๆ": "#94A3B8",
};

// ---------------------------------------------------------
// Page
// ---------------------------------------------------------

export default async function ReportsPage() {
  const supabase = createServerSupabase();

  const [evRes, roomsRes, tutorsRes] = await Promise.all([
    supabase
      .from("schedule_events")
      .select(
        `
        *,
        course:courses(id, title_th, default_color_hex),
        tutor:tutor_profiles(id, display_name_th, short_code, color_hex),
        room:rooms(id, code, name_th, capacity, building)
      `,
      )
      .in("status", ["draft", "scheduled"]),
    supabase
      .from("rooms")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("tutor_profiles")
      .select("*")
      .eq("active", true)
      .order("display_name_th"),
  ]);

  if (evRes.error || roomsRes.error || tutorsRes.error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-red-600">โหลดข้อมูลไม่ได้</h1>
      </main>
    );
  }

  const events = (evRes.data ?? []) as (EventWithRelations & {
    room?: Pick<Room, "id" | "code" | "name_th" | "capacity" | "building"> | null;
  })[];
  const rooms = (roomsRes.data ?? []) as Room[];
  const tutors = (tutorsRes.data ?? []) as TutorProfile[];

  // ---------------- Summary ----------------
  const totalHours = events.reduce((s, e) => s + eventDurationHours(e), 0);
  const avgClassHours = events.length > 0 ? totalHours / events.length : 0;
  const onsiteCount = events.filter((e) => e.delivery_mode !== "online").length;
  const onlineCount = events.filter((e) => e.delivery_mode === "online").length;

  // ---------------- Room utilization ----------------
  // ห้องเปิด 09:00-22:00 = 13 ชม./วัน × 7 วัน = 91 ชม./สัปดาห์
  const ROOM_HOURS_PER_WEEK = 91;
  const roomUsage = rooms.map((room) => {
    const evs = events.filter((e) => e.room_id === room.id);
    const hours = evs.reduce((s, e) => s + eventDurationHours(e), 0);
    return {
      room,
      hours,
      classCount: evs.length,
      pct: (hours / ROOM_HOURS_PER_WEEK) * 100,
    };
  });
  roomUsage.sort((a, b) => b.hours - a.hours);

  // ---------------- Tutor load ----------------
  const tutorLoad = tutors.map((tutor) => {
    const evs = events.filter((e) => e.tutor_profile_id === tutor.id);
    const hours = evs.reduce((s, e) => s + eventDurationHours(e), 0);
    return { tutor, hours, classCount: evs.length };
  });
  tutorLoad.sort((a, b) => b.hours - a.hours);
  const maxTutorHours = Math.max(1, ...tutorLoad.map((t) => t.hours));

  // ---------------- Day distribution ----------------
  const dayCounts: Record<DayOfWeek, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0,
  };
  for (const e of events) dayCounts[e.day_of_week]++;
  const maxDayCount = Math.max(1, ...Object.values(dayCounts));

  // ---------------- Subject distribution ----------------
  const subjectCounts: Record<string, number> = {};
  for (const e of events) {
    const sub = detectSubject(e.title_th);
    subjectCounts[sub] = (subjectCounts[sub] ?? 0) + 1;
  }
  const subjectList = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      pct: (count / events.length) * 100,
      color: SUBJECT_COLOR[name] ?? "#94A3B8",
    }));

  // ---------------- Capacity warnings ----------------
  const capacityIssues = events
    .filter(
      (e) =>
        e.room &&
        e.planned_student_count != null &&
        e.planned_student_count > e.room.capacity,
    )
    .map((e) => ({
      title: e.title_th,
      room: e.room!.code,
      planned: e.planned_student_count!,
      capacity: e.room!.capacity,
    }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-brand-600">
            หน้าแรก
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">รายงานคุณภาพคอร์ส</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            📊 รายงานคุณภาพคอร์ส
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            สรุปการใช้งานห้อง · ภาระงานครู · การกระจายตามวัน/วิชา
            จากตารางทั้งหมดในระบบ
          </p>
        </header>

        {/* Top summary */}
        <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="คลาสทั้งหมด"
            value={events.length}
            suffix="คลาส"
            tone="brand"
          />
          <SummaryCard
            label="ชั่วโมงสอน/สัปดาห์"
            value={Math.round(totalHours)}
            suffix="ชม."
            tone="emerald"
          />
          <SummaryCard
            label="ความยาวคลาสเฉลี่ย"
            value={Number(avgClassHours.toFixed(1))}
            suffix="ชม."
            tone="violet"
          />
          <SummaryCard
            label="ออนไซต์ : ออนไลน์"
            value={`${onsiteCount}:${onlineCount}`}
            suffix=""
            tone="amber"
          />
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Room utilization */}
          <Card title="🏛️ การใช้งานห้องเรียน" subtitle="ชั่วโมง/สัปดาห์ · เรียงจากใช้เยอะที่สุด">
            <ul className="space-y-3">
              {roomUsage.map(({ room, hours, classCount, pct }) => (
                <li key={room.id}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {room.building && (
                        <span className="mr-1 text-[11px] text-gray-400">
                          [{room.building}]
                        </span>
                      )}
                      {room.code}{" "}
                      <span className="text-gray-400">
                        (จุ {room.capacity})
                      </span>
                    </span>
                    <span className="tabular-nums text-gray-600">
                      {hours.toFixed(1)} ชม. · {classCount} คลาส ·{" "}
                      <span className="font-semibold">{pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <Bar pct={Math.min(100, pct)} tone={pct > 50 ? "emerald" : pct > 20 ? "amber" : "gray"} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-gray-400">
              * 100% = ใช้งาน 91 ชม./สัปดาห์ (09:00–22:00 ทุกวัน)
            </p>
          </Card>

          {/* Tutor load */}
          <Card title="👨‍🏫 ภาระงานครู" subtitle="ชั่วโมงสอน/สัปดาห์ · เรียงจากเยอะที่สุด">
            <ul className="space-y-3">
              {tutorLoad
                .filter((t) => t.classCount > 0)
                .map(({ tutor, hours, classCount }) => (
                  <li key={tutor.id}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-medium text-gray-900">
                        {tutor.display_name_th}{" "}
                        <span className="text-gray-400">
                          ({tutor.short_code})
                        </span>
                      </span>
                      <span className="tabular-nums text-gray-600">
                        <span className="font-semibold">{hours.toFixed(1)} ชม.</span>{" "}
                        · {classCount} คลาส
                      </span>
                    </div>
                    <Bar
                      pct={(hours / maxTutorHours) * 100}
                      tone={hours > 15 ? "rose" : hours > 8 ? "amber" : "emerald"}
                    />
                  </li>
                ))}
              {tutorLoad.filter((t) => t.classCount === 0).length > 0 && (
                <li className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
                  ครูที่ยังไม่มีคลาส:{" "}
                  {tutorLoad
                    .filter((t) => t.classCount === 0)
                    .map((t) => t.tutor.display_name_th)
                    .join(", ")}
                </li>
              )}
            </ul>
          </Card>

          {/* Day distribution */}
          <Card title="📅 จำนวนคลาสต่อวัน" subtitle="วันไหนหนาแน่นที่สุด">
            <div className="grid grid-cols-7 gap-2">
              {([1, 2, 3, 4, 5, 6, 7] as DayOfWeek[]).map((d) => {
                const count = dayCounts[d];
                const heightPct = (count / maxDayCount) * 100;
                return (
                  <div key={d} className="flex flex-col items-center">
                    <div className="relative flex h-32 w-full items-end">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-brand-500 to-amber-300 transition"
                        style={{ height: `${heightPct}%` }}
                        title={`${count} คลาส`}
                      />
                    </div>
                    <div className="mt-1 text-xs font-semibold text-gray-700">
                      {WEEK_DAYS_TH_SHORT[d - 1]}
                    </div>
                    <div className="text-[11px] tabular-nums text-gray-500">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-gray-400">
              วันที่หนาแน่นสุด: <span className="font-medium text-gray-700">
                {WEEK_DAYS_TH_SHORT[
                  Object.entries(dayCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0][0]
                    ? Number(Object.entries(dayCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0][0]) - 1
                    : 0
                ]}
              </span>{" "}
              ({maxDayCount} คลาส)
            </p>
          </Card>

          {/* Subject distribution */}
          <Card title="📚 การกระจายตามวิชา" subtitle="วิชาไหนเปิดสอนเยอะที่สุด">
            <ul className="space-y-2">
              {subjectList.map((s) => (
                <li key={s.name}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-gray-900">
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ background: s.color }}
                      />
                      {s.name}
                    </span>
                    <span className="tabular-nums text-gray-600">
                      <span className="font-semibold">{s.count}</span> คลาส (
                      {s.pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition"
                      style={{ width: `${s.pct}%`, background: s.color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Capacity warnings — full width */}
        <section className="mt-6">
          <Card
            title="⚠️ คลาสเกินความจุห้อง"
            subtitle="นักเรียนที่วางแผนไว้มากกว่าความจุห้อง — ควรย้ายห้องหรือลดจำนวน"
          >
            {capacityIssues.length === 0 ? (
              <p className="text-sm text-gray-500">
                ✅ ไม่มีคลาสที่เกินความจุห้อง — ทุกอย่างปกติ
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {capacityIssues.map((c, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="font-medium text-gray-900">{c.title}</span>
                    <span className="text-red-700">
                      ห้อง {c.room}: {c.planned} คน / จุ {c.capacity} —{" "}
                      <span className="font-semibold">
                        เกิน {c.planned - c.capacity} คน
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-gray-400">
          ข้อมูลคำนวณจาก schedule_events ปัจจุบัน · refresh อัตโนมัติเมื่อมีการเปลี่ยนตาราง
        </p>
      </div>
    </main>
  );
}

// ---------------------------------------------------------
// Sub-components
// ---------------------------------------------------------

const SUMMARY_TONE = {
  brand: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", value: "text-amber-900" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", value: "text-emerald-900" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", value: "text-violet-900" },
  amber: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", value: "text-orange-900" },
} as const;

function SummaryCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number | string;
  suffix: string;
  tone: keyof typeof SUMMARY_TONE;
}) {
  const c = SUMMARY_TONE[tone];
  return (
    <div className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
      <div className={`text-[11px] font-medium uppercase tracking-wide ${c.text}`}>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className={`text-3xl font-bold tabular-nums ${c.value}`}>{value}</div>
        {suffix && <div className={`text-sm ${c.text}`}>{suffix}</div>}
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
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

const BAR_TONE = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  gray: "bg-gray-300",
} as const;

function Bar({ pct, tone }: { pct: number; tone: keyof typeof BAR_TONE }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full transition ${BAR_TONE[tone]}`}
        style={{ width: `${Math.max(2, pct)}%` }}
      />
    </div>
  );
}
