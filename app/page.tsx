import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerSupabase();

  const [roomsRes, eventsRes, tutorsRes, pendingsRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("schedule_events")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "scheduled"]),
    supabase
      .from("tutor_profiles")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("pending_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const roomCount = roomsRes.count ?? 0;
  const eventCount = eventsRes.count ?? 0;
  const tutorCount = tutorsRes.count ?? 0;
  const pendingCount = pendingsRes.count ?? 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero */}
        <header className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Knowledge Academy
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            ระบบจัดตารางห้องเรียน
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
            ดูตารางคลาสทุกห้อง · จัดคลาสด้วย drag-and-drop · รับดีลใหม่จากลูกค้า
            ทั้งหมดในที่เดียว
          </p>
        </header>

        {/* Quick stats */}
        <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="ห้องเรียน"
            value={roomCount}
            suffix="ห้อง"
            tone="amber"
          />
          <StatCard
            label="คลาสประจำสัปดาห์"
            value={eventCount}
            suffix="คลาส"
            tone="emerald"
          />
          <StatCard
            label="ติวเตอร์"
            value={tutorCount}
            suffix="คน"
            tone="violet"
          />
          <StatCard
            label="รอจัดตาราง"
            value={pendingCount}
            suffix="ดีล"
            tone="rose"
            highlight={pendingCount > 0}
          />
        </section>

        {/* Primary CTA — Big colorful card */}
        <section className="mb-8">
          <Link
            href="/admin/room-schedule"
            className="group block overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-amber-400 to-amber-300 p-6 shadow-lg shadow-brand-500/20 transition hover:shadow-xl hover:shadow-brand-500/30 sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-xl">
                <div className="text-xs font-semibold uppercase tracking-widest text-amber-50/90">
                  ✦ เมนูหลัก
                </div>
                <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  ตารางห้องเรียน
                </h2>
                <p className="mt-2 text-sm text-amber-50/95 sm:text-base">
                  ดูทุกห้องในวัน · จัดคลาส drag-drop · สลับมุมมองรายวัน / รายสัปดาห์
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/95 px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition group-hover:scale-105 group-hover:bg-white">
                เปิดตารางวันนี้
                <span aria-hidden>→</span>
              </div>
            </div>
          </Link>
        </section>

        {/* Secondary actions */}
        <section className="mb-12">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
            จัดการ
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              href="/admin/rooms"
              icon="🏛️"
              title="จัดการห้อง"
              desc="สร้าง / แก้ไข / ปิดใช้ห้องเรียน"
              meta={`${roomCount} ห้อง`}
            />
            <ActionCard
              href="/admin/tutors"
              icon="👤"
              title="จัดการติวเตอร์"
              desc="เพิ่ม / แก้ไข ติวเตอร์ + short code + สี"
              meta={`${tutorCount} คน`}
            />
            <ActionCard
              href="/admin/waiting-list"
              icon="📋"
              title="คลังรอจัดตาราง"
              desc="ดีลที่ยังไม่ได้กำหนดวัน/ห้อง — ลากลงตารางได้"
              meta={`${pendingCount} ดีล`}
              badge={pendingCount > 0 ? pendingCount : undefined}
            />
            <ActionCard
              href="/tutor/my-schedule"
              icon="👨‍🏫"
              title="ตารางสอนของฉัน"
              desc="ดูตารางครูแต่ละคนแบบ grid"
              meta={`${tutorCount} คน`}
            />
            <ActionCard
              href="/admin/reports"
              icon="📊"
              title="รายงานคุณภาพคอร์ส"
              desc="สรุปการใช้ห้อง · ภาระงานครู · กระจายตามวัน"
              meta="วิเคราะห์"
            />
            <ActionCard
              href="/admin/agents"
              icon="🤖"
              title="ผู้ช่วยจัดตาราง (AI)"
              desc="10 agent · วิเคราะห์/แนะนำ slot · ทดสอบผ่าน panel"
              meta="Phase 1"
            />
          </div>
        </section>

        {/* Coming soon — minimal */}
        <section className="border-t border-gray-200 pt-6">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
            กำลังพัฒนา
          </h2>
          <div className="flex flex-wrap gap-2">
            <ComingSoonChip>🔍 เช็คห้องว่างตามเงื่อนไข</ComingSoonChip>
            <ComingSoonChip>📥 นำเข้าจาก Google Sheet (อัตโนมัติ)</ComingSoonChip>
            <ComingSoonChip>🔐 Login + role (ครู/แอดมิน)</ComingSoonChip>
          </div>
        </section>
      </div>
    </main>
  );
}

// ----------------------------------------------------------------------

const TONE_CLASSES = {
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    value: "text-amber-900",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    value: "text-emerald-900",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    value: "text-violet-900",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    value: "text-rose-900",
  },
} as const;

function StatCard({
  label,
  value,
  suffix,
  tone,
  highlight = false,
}: {
  label: string;
  value: number;
  suffix: string;
  tone: keyof typeof TONE_CLASSES;
  highlight?: boolean;
}) {
  const c = TONE_CLASSES[tone];
  return (
    <div
      className={[
        "rounded-2xl border p-4 transition",
        c.bg,
        c.border,
        highlight ? "ring-2 ring-rose-300 ring-offset-1" : "",
      ].join(" ")}
    >
      <div className={`text-[11px] font-medium uppercase tracking-wide ${c.text}`}>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className={`text-3xl font-bold tabular-nums ${c.value}`}>{value}</div>
        <div className={`text-sm ${c.text}`}>{suffix}</div>
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  desc,
  meta,
  badge,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  meta?: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative block rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      {badge !== undefined && (
        <span className="absolute -top-2 -right-2 flex h-7 min-w-[28px] items-center justify-center rounded-full bg-rose-500 px-2 text-xs font-semibold text-white shadow ring-2 ring-white">
          {badge}
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-brand-700">
              {title}
            </h3>
            {meta && <span className="text-xs text-gray-400">{meta}</span>}
          </div>
          <p className="mt-1 text-sm text-gray-500">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

function ComingSoonChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-gray-300 bg-white/50 px-3 py-1 text-xs text-gray-500">
      {children}
    </span>
  );
}
