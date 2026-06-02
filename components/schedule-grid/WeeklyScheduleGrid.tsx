"use client";

import { useState } from "react";
import type {
  Course,
  DayOfWeek,
  PendingBooking,
  Room,
  TutorProfile,
} from "@/lib/supabase/types";
import { EVENT_DRAG_MIME, type EventWithRelations } from "./EventBlock";
import { useRouter } from "next/navigation";
import { moveEvent } from "@/app/admin/room-schedule/actions";
import { useEditPin } from "@/components/edit-mode/useEditMode";
import { EventDrawer } from "./EventDrawer";
import { ScheduleFromPendingModal } from "./ScheduleFromPendingModal";
import { shortHHMM } from "@/lib/time/grid";
import { WEEK_DAYS_TH_LONG, WEEK_DAYS_TH_SHORT } from "@/lib/time/week";

type Props = {
  rooms: Room[];
  events: EventWithRelations[];
  pendings: PendingBooking[];
  tutors: TutorProfile[];
  courses: Course[];
};

const DRAG_MIME = "application/x-pending-booking-id";

type DropTarget = {
  pending: PendingBooking;
  roomId: string | null;
  dayOfWeek: DayOfWeek;
};

export function WeeklyScheduleGrid({
  rooms,
  events,
  pendings,
  tutors,
  courses,
}: Props) {
  const router = useRouter();
  const { pin, isUnlocked } = useEditPin();
  const [openEvent, setOpenEvent] = useState<EventWithRelations | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  // group events by roomId|day → list of events
  const grouped = new Map<string, EventWithRelations[]>();
  const onlineEventsByDay = new Map<number, EventWithRelations[]>();

  for (const ev of events) {
    if (!ev.room_id) {
      const arr = onlineEventsByDay.get(ev.day_of_week) ?? [];
      arr.push(ev);
      onlineEventsByDay.set(ev.day_of_week, arr);
      continue;
    }
    const key = `${ev.room_id}|${ev.day_of_week}`;
    const arr = grouped.get(key) ?? [];
    arr.push(ev);
    grouped.set(key, arr);
  }
  for (const arr of grouped.values()) {
    arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }
  for (const arr of onlineEventsByDay.values()) {
    arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  const hasOnlinePending = pendings.some((p) => p.delivery_mode === "online");
  const showOnlineRow =
    onlineEventsByDay.size > 0 || hasOnlinePending;

  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
        ยังไม่มีห้องในระบบ — ไปเพิ่มที่หน้า{" "}
        <span className="font-medium">จัดการห้อง</span> ก่อน
      </div>
    );
  }

  // group rooms by building
  type Section = { building: string; rooms: Room[] };
  const buildingMap = new Map<string, Room[]>();
  for (const r of rooms) {
    const key = r.building ?? "(ไม่ระบุตึก)";
    const arr = buildingMap.get(key) ?? [];
    arr.push(r);
    buildingMap.set(key, arr);
  }
  const sections: Section[] = Array.from(buildingMap.entries())
    .map(([building, rs]) => ({
      building,
      rooms: rs.slice().sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => {
      const aMin = Math.min(...a.rooms.map((r) => r.sort_order));
      const bMin = Math.min(...b.rooms.map((r) => r.sort_order));
      return aMin - bMin;
    });

  // DnD
  async function handleDrop(
    e: React.DragEvent,
    roomId: string | null,
    dayOfWeek: DayOfWeek,
  ) {
    e.preventDefault();
    setMoveError(null);

    // case 1: drop pending booking
    const pendingId = e.dataTransfer.getData(DRAG_MIME);
    if (pendingId) {
      if (!isUnlocked) {
        setMoveError("ต้องเปิดโหมดแก้ไขก่อน (ปุ่ม 🔒 มุมซ้ายล่าง)");
        setTimeout(() => setMoveError(null), 4000);
        setDraggingId(null);
        return;
      }
      const pending = pendings.find((p) => p.id === pendingId);
      if (pending) setDropTarget({ pending, roomId, dayOfWeek });
      setDraggingId(null);
      return;
    }

    // case 2: drop existing event — เปลี่ยนวัน/ห้อง (เก็บเวลาเดิม)
    const eventId = e.dataTransfer.getData(EVENT_DRAG_MIME);
    if (eventId) {
      setDraggingId(null);
      if (!isUnlocked) {
        setMoveError("ต้องเปิดโหมดแก้ไขก่อน (ปุ่ม 🔒 มุมซ้ายล่าง)");
        setTimeout(() => setMoveError(null), 4000);
        return;
      }
      const ev = events.find((x) => x.id === eventId);
      if (!ev) return;
      const startHHMM = ev.start_time.slice(0, 5);
      const res = await moveEvent({
        id: eventId,
        day_of_week: dayOfWeek,
        start_time: startHHMM,
        room_id: roomId,
        pin,
      });
      if (!res.ok) {
        setMoveError(res.error ?? "ย้ายไม่สำเร็จ");
        setTimeout(() => setMoveError(null), 4000);
      } else {
        router.refresh();
      }
    }
  }
  function handleDragOver(e: React.DragEvent) {
    if (
      e.dataTransfer.types.includes(DRAG_MIME) ||
      e.dataTransfer.types.includes(EVENT_DRAG_MIME)
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }

  return (
    <>
      {pendings.length > 0 && (
        <WaitingListPanel
          pendings={pendings}
          draggingId={draggingId}
          onDragStart={(id) => setDraggingId(id)}
          onDragEnd={() => setDraggingId(null)}
        />
      )}

      <div className="mb-3 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          แสดงภาพรวม <span className="font-semibold text-gray-900">ทั้งสัปดาห์</span>{" "}
          — คลาส repeat ทุกสัปดาห์ · ลากกล่องคลาส→วันอื่น/ห้องอื่นเพื่อย้าย
        </div>
        {moveError && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
            ⚠ {moveError}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div
          className="min-w-[1000px]"
          style={{
            display: "grid",
            gridTemplateColumns: "160px repeat(7, minmax(130px, 1fr))",
          }}
        >
          {/* header */}
          <div className="sticky left-0 z-20 flex items-center justify-center border-b border-r border-gray-200 bg-gray-50 py-2 text-xs font-semibold text-gray-500">
            ห้อง / วัน
          </div>
          {WEEK_DAYS_TH_SHORT.map((short, i) => (
            <div
              key={short}
              className="flex flex-col items-center justify-center border-b border-gray-200 bg-gray-50 py-2 text-xs"
            >
              <div className="font-semibold text-gray-700">{short}</div>
              <div className="text-[11px] text-gray-500">
                {WEEK_DAYS_TH_LONG[i]}
              </div>
            </div>
          ))}

          {/* sections + room rows */}
          {sections.map((section) => (
            <Section
              key={section.building}
              section={section}
              grouped={grouped}
              isDragging={draggingId !== null}
              onClickEvent={setOpenEvent}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onEventDragStart={(id) => setDraggingId(id)}
              onEventDragEnd={() => setDraggingId(null)}
            />
          ))}

          {/* online row */}
          {showOnlineRow && (
            <OnlineRow
              eventsByDay={onlineEventsByDay}
              isDragging={draggingId !== null}
              onClickEvent={setOpenEvent}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onEventDragStart={(id) => setDraggingId(id)}
              onEventDragEnd={() => setDraggingId(null)}
            />
          )}
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        คลาสในสัปดาห์: <span className="font-semibold">{events.length}</span>
      </div>

      <EventDrawer
        key={openEvent?.id ?? "none"}
        event={openEvent}
        rooms={rooms}
        tutors={tutors}
        courses={courses}
        onClose={() => setOpenEvent(null)}
      />

      <ScheduleFromPendingModal
        open={dropTarget !== null}
        pending={dropTarget?.pending ?? null}
        rooms={rooms}
        initialRoomId={dropTarget?.roomId ?? null}
        initialDayOfWeek={dropTarget?.dayOfWeek ?? 1}
        initialStartTime="17:30:00"
        onClose={() => setDropTarget(null)}
      />
    </>
  );
}

// ----------------------------------------------------------------------

type DragCbs = {
  onEventDragStart: (id: string) => void;
  onEventDragEnd: () => void;
};

function Section({
  section,
  grouped,
  isDragging,
  onClickEvent,
  onDrop,
  onDragOver,
  onEventDragStart,
  onEventDragEnd,
}: {
  section: { building: string; rooms: Room[] };
  grouped: Map<string, EventWithRelations[]>;
  isDragging: boolean;
  onClickEvent: (e: EventWithRelations) => void;
  onDrop: (e: React.DragEvent, roomId: string | null, dow: DayOfWeek) => void;
  onDragOver: (e: React.DragEvent) => void;
} & DragCbs) {
  return (
    <>
      <div
        className="border-b border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-900"
        style={{ gridColumn: "1 / -1" }}
      >
        {section.building}
      </div>
      {section.rooms.map((room) => (
        <RoomRow
          key={room.id}
          room={room}
          grouped={grouped}
          isDragging={isDragging}
          onClickEvent={onClickEvent}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onEventDragStart={onEventDragStart}
          onEventDragEnd={onEventDragEnd}
        />
      ))}
    </>
  );
}

function RoomRow({
  room,
  grouped,
  isDragging,
  onClickEvent,
  onDrop,
  onDragOver,
  onEventDragStart,
  onEventDragEnd,
}: {
  room: Room;
  grouped: Map<string, EventWithRelations[]>;
  isDragging: boolean;
  onClickEvent: (e: EventWithRelations) => void;
  onDrop: (e: React.DragEvent, roomId: string | null, dow: DayOfWeek) => void;
  onDragOver: (e: React.DragEvent) => void;
} & DragCbs) {
  return (
    <>
      <div className="sticky left-0 z-10 flex flex-col justify-center border-b border-r border-gray-200 bg-white px-3 py-3">
        <div className="text-sm font-semibold text-gray-900">
          {room.code}
          {room.capacity > 0 && (
            <span className="ml-1 text-xs font-normal text-gray-500">
              ({room.capacity})
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-gray-500">
          {room.name_th}
        </div>
      </div>
      {([1, 2, 3, 4, 5, 6, 7] as DayOfWeek[]).map((dow) => {
        const cellEvents = grouped.get(`${room.id}|${dow}`) ?? [];
        return (
          <DayCell
            key={dow}
            cellEvents={cellEvents}
            isDragging={isDragging}
            onClickEvent={onClickEvent}
            onDrop={(e) => onDrop(e, room.id, dow)}
            onDragOver={onDragOver}
            onEventDragStart={onEventDragStart}
            onEventDragEnd={onEventDragEnd}
          />
        );
      })}
    </>
  );
}

function OnlineRow({
  eventsByDay,
  isDragging,
  onClickEvent,
  onDrop,
  onDragOver,
  onEventDragStart,
  onEventDragEnd,
}: {
  eventsByDay: Map<number, EventWithRelations[]>;
  isDragging: boolean;
  onClickEvent: (e: EventWithRelations) => void;
  onDrop: (e: React.DragEvent, roomId: string | null, dow: DayOfWeek) => void;
  onDragOver: (e: React.DragEvent) => void;
} & DragCbs) {
  return (
    <>
      <div
        className="border-b border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-900"
        style={{ gridColumn: "1 / -1" }}
      >
        ONLINE
      </div>
      <div className="sticky left-0 z-10 flex flex-col justify-center border-b border-r border-gray-200 bg-indigo-50 px-3 py-3">
        <div className="text-sm font-semibold text-indigo-900">ออนไลน์</div>
        <div className="text-[11px] text-indigo-600">ไม่ใช้ห้อง</div>
      </div>
      {([1, 2, 3, 4, 5, 6, 7] as DayOfWeek[]).map((dow) => {
        const cellEvents = eventsByDay.get(dow) ?? [];
        return (
          <DayCell
            key={dow}
            cellEvents={cellEvents}
            isDragging={isDragging}
            onClickEvent={onClickEvent}
            onDrop={(e) => onDrop(e, null, dow)}
            onDragOver={onDragOver}
            onEventDragStart={onEventDragStart}
            onEventDragEnd={onEventDragEnd}
            tone="indigo"
          />
        );
      })}
    </>
  );
}

function DayCell({
  cellEvents,
  isDragging,
  onClickEvent,
  onDrop,
  onDragOver,
  onEventDragStart,
  onEventDragEnd,
  tone = "default",
}: {
  cellEvents: EventWithRelations[];
  isDragging: boolean;
  onClickEvent: (e: EventWithRelations) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onEventDragStart: (id: string) => void;
  onEventDragEnd: () => void;
  tone?: "default" | "indigo";
}) {
  const [hover, setHover] = useState(false);
  const bg = tone === "indigo" ? "bg-indigo-50/20" : "bg-white";
  return (
    <div
      onDragOver={(e) => {
        onDragOver(e);
        if (isDragging) setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        setHover(false);
        onDrop(e);
      }}
      className={[
        "flex flex-col gap-1 border-b border-r border-gray-100 p-1.5",
        bg,
        isDragging ? "outline-dashed outline-1 outline-amber-200" : "",
        hover && isDragging ? "bg-amber-200/60 outline-amber-500" : "",
      ].join(" ")}
      style={{ minHeight: 72 }}
    >
      {cellEvents.map((ev) => (
        <MiniEvent
          key={ev.id}
          event={ev}
          onClick={() => onClickEvent(ev)}
          onDragStart={onEventDragStart}
          onDragEnd={onEventDragEnd}
        />
      ))}
    </div>
  );
}

function MiniEvent({
  event,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  event: EventWithRelations;
  onClick: () => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}) {
  const color =
    event.color_hex ||
    event.course?.default_color_hex ||
    event.tutor?.color_hex ||
    "#E5E7EB";
  const isBlock = event.event_type === "room_block";
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
      onClick={onClick}
      className={[
        "group relative rounded-md border-l-4 px-1.5 py-1 text-left cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:ring-2 hover:ring-brand-300",
        "transition focus:outline-none focus:ring-2 focus:ring-brand-400",
        isBlock ? "border-dashed border-gray-300" : "",
        event.status === "cancelled" ? "opacity-40 line-through" : "",
      ].join(" ")}
      style={{
        background: hexToBgTint(color),
        borderLeftColor: color,
      }}
      title={`${event.title_th} (${start}–${end}) — ลากไปวันอื่นได้`}
    >
      <div className="text-[10px] font-mono font-semibold tabular-nums text-gray-700">
        {start}–{end}
      </div>
      <div className="truncate text-[11px] font-medium text-gray-900">
        {event.title_th}
      </div>
      {event.tutor?.display_name_th && (
        <div className="truncate text-[10px] text-gray-500">
          {event.tutor.display_name_th}
        </div>
      )}
    </button>
  );
}

// ----------------------------------------------------------------------
// Waiting list panel
// ----------------------------------------------------------------------

function WaitingListPanel({
  pendings,
  draggingId,
  onDragStart,
  onDragEnd,
}: {
  pendings: PendingBooking[];
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-amber-50/40 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          คลังรอจัดตาราง ({pendings.length})
        </div>
        <div className="text-[11px] text-gray-500">
          ลากการ์ด → วางในช่องวัน → เลือกห้อง/เวลาใน modal
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {pendings.map((p) => (
          <PendingCard
            key={p.id}
            pending={p}
            isDragging={draggingId === p.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

function PendingCard({
  pending,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  pending: PendingBooking;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const color = pending.color_hex || "#94A3B8";
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, pending.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(pending.id);
      }}
      onDragEnd={onDragEnd}
      className={[
        "min-w-[200px] max-w-[220px] cursor-grab select-none rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition active:cursor-grabbing",
        isDragging ? "opacity-40" : "hover:shadow-md",
      ].join(" ")}
      style={{ borderLeft: `4px solid ${color}` }}
      title={`${pending.class_code} — ลากแล้ววางในช่องวันในตาราง`}
    >
      <div className="font-mono text-[10px] font-semibold text-brand-600">
        {pending.class_code}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold text-gray-900">
        {pending.title_th}
      </div>
      <div className="mt-1 text-[11px] text-gray-500">
        {Math.round((pending.duration_minutes / 60) * 10) / 10} ชม. ·{" "}
        {pending.delivery_mode === "online"
          ? "ออนไลน์"
          : pending.delivery_mode === "hybrid"
            ? "ไฮบริด"
            : "ออนไซต์"}
        {pending.planned_student_count
          ? ` · ${pending.planned_student_count} คน`
          : ""}
      </div>
      {pending.student_names && pending.student_names.length > 0 && (
        <div className="mt-1 truncate text-[11px] text-gray-600">
          👥 {pending.student_names.slice(0, 3).join(", ")}
          {pending.student_names.length > 3
            ? ` +${pending.student_names.length - 3}`
            : ""}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function hexToBgTint(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#F9FAFB";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * 0.25 + 255 * 0.75);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
