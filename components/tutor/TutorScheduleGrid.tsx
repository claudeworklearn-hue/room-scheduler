"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import type { Course, DayOfWeek, Room, TutorProfile } from "@/lib/supabase/types";
import type { EventWithRelations } from "@/components/schedule-grid/EventBlock";
import { EventDrawer } from "@/components/schedule-grid/EventDrawer";
import { useEditPin } from "@/components/edit-mode/useEditMode";
import {
  shortHHMM,
  SLOTS_PER_DAY,
  eventSlotRange,
  buildSlotLabels,
} from "@/lib/time/grid";
import { WEEK_DAYS_TH_LONG } from "@/lib/time/week";
import { resolveEventColor } from "@/lib/subject-colors";

type EventWithRoom = EventWithRelations & {
  room?: { id: string; code: string; name_th: string; capacity: number } | null;
};

type Props = {
  tutors: TutorProfile[];
  selectedTutorId: string;
  events: EventWithRoom[];
  rooms?: Room[];
  courses?: Course[];
};

const DAY_COL_PX = 110;   // ความกว้างของคอลัมน์ชื่อวัน (ซ้ายสุด)
const SLOT_PX = 56;       // ความกว้างของแต่ละช่อง 30 นาที
const HEADER_PX = 36;     // ความสูงของแถวหัวเวลา (บนสุด)
const ROW_PX = 80;        // ความสูงของแต่ละแถววัน

export function TutorScheduleGrid({
  tutors,
  selectedTutorId,
  events,
  rooms = [],
  courses = [],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { isUnlocked } = useEditPin();
  const [openEvent, setOpenEvent] = useState<EventWithRoom | null>(null);

  function go(params: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  const slotLabels = buildSlotLabels();
  const days: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];
  const totalWidth = DAY_COL_PX + SLOTS_PER_DAY * SLOT_PX;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600">ติวเตอร์</label>
          <select
            value={selectedTutorId}
            onChange={(e) => go({ tutor: e.target.value })}
            disabled={isPending}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.display_name_th} ({t.short_code})
              </option>
            ))}
          </select>
        </div>

        <div className="text-right text-sm text-gray-500">
          คลาสประจำสัปดาห์ทั้งหมด:{" "}
          <span className="font-semibold text-gray-900">{events.length}</span>{" "}
          คลาส
        </div>
      </header>

      {events.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          ยังไม่มีคลาสประจำสัปดาห์
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div
            className="relative"
            style={{
              display: "grid",
              gridTemplateColumns: `${DAY_COL_PX}px repeat(${SLOTS_PER_DAY}, ${SLOT_PX}px)`,
              gridTemplateRows: `${HEADER_PX}px repeat(7, ${ROW_PX}px)`,
              width: totalWidth,
            }}
          >
            {/* Top-left corner */}
            <div
              className="sticky left-0 top-0 z-30 flex items-center justify-center border-b border-r border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500"
              style={{ gridRow: 1, gridColumn: 1 }}
            >
              วัน / เวลา
            </div>

            {/* Time labels (header row) */}
            {slotLabels.map((label, i) => {
              const isHour = label.endsWith(":00");
              return (
                <div
                  key={`t-${i}`}
                  className={`sticky top-0 z-20 flex items-end justify-center border-b border-gray-200 bg-gray-50 pb-1 text-[11px] ${
                    isHour
                      ? "font-semibold text-gray-700"
                      : "text-gray-400"
                  }`}
                  style={{ gridRow: 1, gridColumn: i + 2 }}
                >
                  {isHour ? label : ""}
                </div>
              );
            })}

            {/* Day rows — label + background cells */}
            {days.map((d) => {
              const row = d + 1; // header = row 1, จันทร์ = row 2 ...
              return (
                <DayRow
                  key={d}
                  row={row}
                  dayName={WEEK_DAYS_TH_LONG[d - 1]}
                />
              );
            })}

            {/* Events */}
            {events.map((ev) => {
              const range = eventSlotRange(ev.start_time, ev.end_time);
              if (!range) return null;
              const color = resolveEventColor(
                ev.title_th,
                [ev.color_hex, ev.course?.default_color_hex, ev.tutor?.color_hex],
                "#E5E7EB",
              );
              const isOnline = ev.delivery_mode === "online";
              const isCancelled = ev.status === "cancelled";

              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={isUnlocked ? () => setOpenEvent(ev) : undefined}
                  style={{
                    gridRow: ev.day_of_week + 1,
                    gridColumn: `${range.startSlot + 2} / span ${range.span}`,
                    background: hexToBgTint(color),
                    borderLeftColor: color,
                    margin: "2px",
                    cursor: isUnlocked ? "pointer" : "default",
                  }}
                  tabIndex={isUnlocked ? 0 : -1}
                  className={[
                    "relative flex flex-col justify-center overflow-hidden",
                    "rounded-md border-l-4 px-2 py-1 text-left text-[11px]",
                    isUnlocked
                      ? "hover:z-10 hover:shadow-md hover:ring-2 hover:ring-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      : "",
                    "transition",
                    isCancelled ? "opacity-40 line-through" : "",
                  ].join(" ")}
                  title={
                    isUnlocked
                      ? `${ev.title_th} (${shortHHMM(ev.start_time)}–${shortHHMM(ev.end_time)}) — คลิกเพื่อแก้`
                      : `${ev.title_th} (${shortHHMM(ev.start_time)}–${shortHHMM(ev.end_time)})`
                  }
                >
                  <div className="truncate font-semibold text-gray-900">
                    {ev.title_th}
                  </div>
                  <div className="truncate text-[10px] text-gray-600">
                    {shortHHMM(ev.start_time)}–{shortHHMM(ev.end_time)}
                    {ev.planned_student_count
                      ? ` · ${ev.planned_student_count} คน`
                      : ""}
                  </div>
                  <div className="truncate text-[10px] text-gray-500">
                    {isOnline
                      ? "ออนไลน์"
                      : ev.room?.code
                        ? `ห้อง ${ev.room.code}`
                        : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>คลาส repeat ทุกสัปดาห์ · ช่องละ 30 นาที (08:00–23:00)</span>
        <span className={isUnlocked ? "text-emerald-600" : "text-gray-400"}>
          {isUnlocked
            ? "✓ โหมดแก้ไข — คลิกคลาสเพื่อแก้"
            : "🔒 โหมดดูอย่างเดียว — กดปุ่ม PIN เพื่อแก้"}
        </span>
      </p>

      <EventDrawer
        key={openEvent?.id ?? "none"}
        event={openEvent}
        rooms={rooms}
        tutors={tutors}
        courses={courses}
        onClose={() => {
          setOpenEvent(null);
          router.refresh();
        }}
      />
    </>
  );
}

// ----------------------------------------------------------------------

function DayRow({ row, dayName }: { row: number; dayName: string }) {
  return (
    <>
      {/* Day label (sticky left) */}
      <div
        className="sticky left-0 z-10 flex items-center justify-center border-b border-r border-gray-200 bg-white text-sm font-semibold text-gray-900"
        style={{ gridRow: row, gridColumn: 1 }}
      >
        {dayName}
      </div>

      {/* Background slot cells */}
      {Array.from({ length: SLOTS_PER_DAY }, (_, i) => (
        <div
          key={`bg-${row}-${i}`}
          className={`border-b border-gray-100 ${
            i % 2 === 0 ? "bg-gray-50/30" : "bg-white"
          }`}
          style={{ gridRow: row, gridColumn: i + 2 }}
        />
      ))}
    </>
  );
}

// ----------------------------------------------------------------------

function hexToBgTint(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#F9FAFB";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * 0.3 + 255 * 0.7);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
