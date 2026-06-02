"use client";

import type { ScheduleEvent, Course, TutorProfile } from "@/lib/supabase/types";
import { shortHHMM } from "@/lib/time/grid";
import { resolveEventColor } from "@/lib/subject-colors";

export type EventWithRelations = ScheduleEvent & {
  course: Pick<Course, "id" | "title_th" | "default_color_hex"> | null;
  tutor: Pick<TutorProfile, "id" | "display_name_th" | "short_code" | "color_hex"> | null;
};

export const EVENT_DRAG_MIME = "application/x-schedule-event-id";

type Props = {
  event: EventWithRelations;
  /** CSS grid placement (เช่น { gridRow: 3, gridColumn: "5 / span 4" }) — ส่งจาก parent */
  placement: React.CSSProperties;
  onClick: (event: EventWithRelations) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
};

const DEFAULT_COLOR = "#E5E7EB";

export function EventBlock({ event, placement, onClick, onDragStart, onDragEnd }: Props) {
  const color = resolveEventColor(
    event.title_th,
    [event.color_hex, event.course?.default_color_hex, event.tutor?.color_hex],
    DEFAULT_COLOR,
  );

  const isBlock = event.event_type === "room_block";
  const isOnline = event.delivery_mode === "online";

  const start = shortHHMM(event.start_time);
  const end = shortHHMM(event.end_time);

  return (
    <button
      type="button"
      draggable={!isBlock}
      onDragStart={(e) => {
        e.dataTransfer.setData(EVENT_DRAG_MIME, event.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(event.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => onClick(event)}
      style={{
        ...placement,
        background: hexToBgTint(color),
        borderLeftColor: color,
      }}
      className={[
        "group relative m-0.5 flex flex-col justify-center overflow-hidden",
        "rounded-md border-l-4 px-2 py-1 text-left text-xs cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:ring-2 hover:ring-brand-300 hover:z-10",
        "transition focus:outline-none focus:ring-2 focus:ring-brand-400",
        isBlock ? "border-dashed border-gray-300" : "",
        event.status === "cancelled" ? "opacity-40 line-through" : "",
      ].join(" ")}
      title={`${event.title_th} (${start}–${end}) — ลากไปวางห้องอื่นได้`}
    >
      <div className="truncate font-semibold text-gray-900">
        {event.title_th}
      </div>
      <div className="truncate text-[11px] text-gray-600">
        {start}–{end}
        {event.tutor?.display_name_th ? ` · ${event.tutor.display_name_th}` : ""}
      </div>
      {!isBlock && (
        <div className="truncate text-[10px] text-gray-500">
          {isOnline ? "ออนไลน์" : event.delivery_mode === "hybrid" ? "ไฮบริด" : "ออนไซต์"}
          {event.planned_student_count
            ? ` · ${event.planned_student_count} คน`
            : ""}
        </div>
      )}
    </button>
  );
}

/** แปลงสี hex → background tint สว่าง ๆ (mix กับขาวประมาณ 70%) */
function hexToBgTint(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#F9FAFB";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // mix 30% color + 70% white
  const mix = (c: number) => Math.round(c * 0.3 + 255 * 0.7);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
