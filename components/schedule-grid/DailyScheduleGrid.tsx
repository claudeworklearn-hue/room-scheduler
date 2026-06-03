"use client";

import { useState } from "react";
import type {
  Branch,
  Course,
  DayOfWeek,
  PendingBooking,
  Room,
  TutorProfile,
} from "@/lib/supabase/types";
import { EventBlock, EVENT_DRAG_MIME, type EventWithRelations } from "./EventBlock";
import { useRouter } from "next/navigation";
import { moveEvent } from "@/app/admin/room-schedule/actions";
import { useEditPin } from "@/components/edit-mode/useEditMode";
import { EventDrawer } from "./EventDrawer";
import { ScheduleFromPendingModal } from "./ScheduleFromPendingModal";
import { PendingFormDrawer } from "@/components/waiting-list/PendingFormDrawer";
import {
  SLOTS_PER_DAY,
  buildSlotLabels,
  eventSlotRange,
  slotToTime,
} from "@/lib/time/grid";
import { WEEK_DAYS_TH_LONG } from "@/lib/time/week";

type Props = {
  rooms: Room[];
  events: EventWithRelations[];
  pendings: PendingBooking[];
  tutors: TutorProfile[];
  courses: Course[];
  branches: Branch[];
  /** วันในสัปดาห์ที่กำลังดู (1=จันทร์..7=อาทิตย์) */
  dayOfWeek: DayOfWeek;
  /** จำนวนนักเรียนจริงต่อ class_code ดึงจากระบบเช็คชื่อแบบ batch */
  enrollmentCounts?: Record<string, number>;
};

const SLOT_PX = 64;
const ROOM_COL_PX = 140;
const ROW_PX = 64;
const HEADER_PX = 36;
const SECTION_HEADER_PX = 30;
const ONLINE_KEY = "__online__";

const DRAG_MIME = "application/x-pending-booking-id";

type DropTarget = {
  pending: PendingBooking;
  roomId: string | null;
  slotIndex: number;
  startTime: string; // "HH:MM:SS"
};

export function DailyScheduleGrid({
  rooms,
  events,
  pendings,
  tutors,
  courses,
  branches,
  dayOfWeek,
  enrollmentCounts,
}: Props) {
  const router = useRouter();
  const { pin, isUnlocked } = useEditPin();
  const [openEvent, setOpenEvent] = useState<EventWithRelations | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [showNewPending, setShowNewPending] = useState(false);

  const slotLabels = buildSlotLabels();
  const totalWidth = ROOM_COL_PX + SLOTS_PER_DAY * SLOT_PX;

  // events ของวันนี้เท่านั้น (กรองโดย parent หรือ filter ที่นี่)
  const dayEvents = events.filter((e) => e.day_of_week === dayOfWeek);

  // group events by room / online
  // Events with delivery_mode='online' belong in the ONLINE row even when
  // they happen to have a room_id from a legacy import — the tag on the
  // card already reads "ออนไลน์" and users expect them grouped there.
  const eventsByRoom = new Map<string, EventWithRelations[]>();
  const onlineEvents: EventWithRelations[] = [];
  for (const ev of dayEvents) {
    if (!ev.room_id || ev.delivery_mode === "online") {
      onlineEvents.push(ev);
      continue;
    }
    const arr = eventsByRoom.get(ev.room_id) ?? [];
    arr.push(ev);
    eventsByRoom.set(ev.room_id, arr);
  }

  // ONLINE has no DB exclusion (no room_id constraint), so multiple
  // teachers can run classes at the same time. Assign each online event
  // to the lowest-numbered "lane" that's free when it starts — the
  // ONLINE row will then span N stacked sub-rows so parallel classes
  // don't overlap visually.
  const onlineLaneMap = assignLanes(onlineEvents);
  const onlineLaneCount =
    onlineLaneMap.size > 0
      ? Math.max(...Array.from(onlineLaneMap.values())) + 1
      : 1;

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

  const hasOnlinePending = pendings.some((p) => p.delivery_mode === "online");
  const showOnlineSection = onlineEvents.length > 0 || hasOnlinePending;

  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
        ยังไม่มีห้องในระบบ — ไปเพิ่มที่หน้า{" "}
        <span className="font-medium">จัดการห้อง</span> ก่อน
      </div>
    );
  }

  // ---------------- DnD handlers ----------------
  async function handleDrop(
    e: React.DragEvent,
    roomId: string | null,
    slotIndex: number,
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
      if (pending) {
        setDropTarget({
          pending,
          roomId,
          slotIndex,
          startTime: slotToTime(slotIndex),
        });
      }
      setDraggingId(null);
      return;
    }

    // case 2: drop existing event (move room/time)
    const eventId = e.dataTransfer.getData(EVENT_DRAG_MIME);
    if (eventId) {
      setDraggingId(null);
      if (!isUnlocked) {
        setMoveError("ต้องเปิดโหมดแก้ไขก่อน (ปุ่ม 🔒 มุมซ้ายล่าง)");
        setTimeout(() => setMoveError(null), 4000);
        return;
      }
      const res = await moveEvent({
        id: eventId,
        day_of_week: dayOfWeek,
        start_time: slotToTime(slotIndex),
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

  // compute row indices
  let rowCursor = 2;
  type RowEntry =
    | { type: "section"; row: number; label: string }
    | { type: "room"; row: number; room: Room; laneCount: number };
  const rowEntries: RowEntry[] = [];
  for (const section of sections) {
    rowEntries.push({ type: "section", row: rowCursor, label: section.building });
    rowCursor++;
    for (const room of section.rooms) {
      rowEntries.push({ type: "room", row: rowCursor, room, laneCount: 1 });
      rowCursor++;
    }
  }
  if (showOnlineSection) {
    rowEntries.push({ type: "section", row: rowCursor, label: "ONLINE" });
    rowCursor++;
    rowEntries.push({
      type: "room",
      row: rowCursor,
      laneCount: onlineLaneCount,
      room: {
        id: ONLINE_KEY,
        branch_id: "",
        building: "ONLINE",
        code: "ออนไลน์",
        name_th: "ไม่ใช้ห้อง",
        name_en: null,
        capacity: 0,
        room_type: "other",
        equipment: [],
        location_note: null,
        sort_order: 9999,
        active: true,
        created_at: "",
        updated_at: "",
      } as Room,
    });
    rowCursor += onlineLaneCount;
  }

  return (
    <>
      <WaitingListPanel
        pendings={pendings}
        draggingId={draggingId}
        onDragStart={(id) => setDraggingId(id)}
        onDragEnd={() => setDraggingId(null)}
        onCreateClick={() => {
          if (!isUnlocked) {
            setMoveError("ต้องเปิดโหมดแก้ไขก่อน (ปุ่ม 🔒 มุมซ้ายล่าง)");
            setTimeout(() => setMoveError(null), 4000);
            return;
          }
          setShowNewPending(true);
        }}
      />

      <div className="mb-3 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          แสดงตารางของ <span className="font-semibold text-gray-900">วัน{WEEK_DAYS_TH_LONG[dayOfWeek - 1]}</span>
          {" "}— คลาส repeat ทุกสัปดาห์ · ลากกล่องคลาส→ห้องอื่นเพื่อย้าย
        </div>
        {moveError && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
            ⚠ {moveError}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div
          className="relative"
          style={{
            display: "grid",
            gridTemplateColumns: `${ROOM_COL_PX}px repeat(${SLOTS_PER_DAY}, ${SLOT_PX}px)`,
            width: totalWidth,
          }}
        >
          {/* header row */}
          <div
            className="sticky left-0 top-0 z-30 flex items-center justify-center border-b border-r border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500"
            style={{ height: HEADER_PX, gridRow: 1, gridColumn: 1 }}
          >
            ห้อง / เวลา
          </div>
          {slotLabels.map((label, i) => {
            const isHour = label.endsWith(":00");
            return (
              <div
                key={label}
                className={`sticky top-0 z-20 flex items-end justify-center border-b border-gray-200 bg-gray-50 pb-1 text-[11px] ${
                  isHour ? "font-semibold text-gray-700" : "text-gray-400"
                }`}
                style={{ height: HEADER_PX, gridRow: 1, gridColumn: i + 2 }}
              >
                {label}
              </div>
            );
          })}

          {/* rows */}
          {rowEntries.map((entry) => {
            if (entry.type === "section") {
              return (
                <SectionHeader
                  key={`sec-${entry.row}`}
                  row={entry.row}
                  label={entry.label}
                />
              );
            }
            const room = entry.room;
            const isOnline = room.id === ONLINE_KEY;
            const roomEvents = isOnline
              ? onlineEvents
              : eventsByRoom.get(room.id) ?? [];
            return (
              <RoomRow
                key={room.id}
                row={entry.row}
                room={room}
                isOnline={isOnline}
                events={roomEvents}
                laneCount={entry.laneCount}
                getEventLane={
                  isOnline ? (id) => onlineLaneMap.get(id) ?? 0 : () => 0
                }
                onClickEvent={setOpenEvent}
                isDragging={draggingId !== null}
                onDrop={(slotIndex) => (e) =>
                  handleDrop(e, isOnline ? null : room.id, slotIndex)
                }
                onDragOver={handleDragOver}
                onEventDragStart={(id) => setDraggingId(id)}
                onEventDragEnd={() => setDraggingId(null)}
                enrollmentCounts={enrollmentCounts}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div>
          คลาสใน{WEEK_DAYS_TH_LONG[dayOfWeek - 1]}:{" "}
          <span className="font-semibold">{dayEvents.length}</span>
          {showOnlineSection && (
            <>
              {" "}· ออนไลน์{" "}
              <span className="font-semibold">{onlineEvents.length}</span>
            </>
          )}
        </div>
        <div>
          {pendings.length > 0
            ? "ลากการ์ดจากด้านบน → วางในช่องเวลา"
            : "คลิกบล็อกคลาสเพื่อดูรายละเอียด · ตัวเลขหลังห้อง = ความจุ"}
        </div>
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
        initialDayOfWeek={dayOfWeek}
        initialStartTime={dropTarget?.startTime ?? "17:30:00"}
        onClose={() => setDropTarget(null)}
      />

      <PendingFormDrawer
        open={showNewPending}
        mode="create"
        branches={branches}
        courses={courses}
        tutors={tutors}
        onClose={() => setShowNewPending(false)}
        onSaved={() => {
          setShowNewPending(false);
          router.refresh();
        }}
      />
    </>
  );
}

// ----------------------------------------------------------------------

function SectionHeader({ row, label }: { row: number; label: string }) {
  return (
    <div
      className="sticky left-0 z-30 flex items-center border-b border-amber-300 bg-amber-100 px-3 text-xs font-bold uppercase tracking-wide text-amber-900"
      style={{
        gridRow: row,
        gridColumn: `1 / -1`,
        height: SECTION_HEADER_PX,
      }}
    >
      {label}
    </div>
  );
}

function RoomRow({
  row,
  room,
  isOnline,
  events,
  laneCount,
  getEventLane,
  onClickEvent,
  isDragging,
  onDrop,
  onDragOver,
  onEventDragStart,
  onEventDragEnd,
  enrollmentCounts,
}: {
  row: number;
  room: Room;
  isOnline: boolean;
  events: EventWithRelations[];
  laneCount: number;
  getEventLane: (eventId: string) => number;
  onClickEvent: (e: EventWithRelations) => void;
  isDragging: boolean;
  onDrop: (slotIndex: number) => (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onEventDragStart: (id: string) => void;
  onEventDragEnd: () => void;
  enrollmentCounts?: Record<string, number>;
}) {
  const labelBg = isOnline ? "bg-indigo-50" : "bg-white";
  const labelText = isOnline ? "text-indigo-900" : "text-gray-900";
  return (
    <>
      <div
        className={`sticky left-0 z-10 flex flex-col justify-center border-b border-r border-gray-200 px-3 ${labelBg}`}
        style={{
          gridRow: `${row} / span ${laneCount}`,
          gridColumn: 1,
          height: ROW_PX * laneCount,
        }}
      >
        <div className={`text-sm font-semibold ${labelText}`}>
          {room.code}
          {room.capacity > 0 && (
            <span className="ml-1 text-xs font-normal text-gray-500">
              ({room.capacity})
            </span>
          )}
        </div>
        {!isOnline && (
          <div className="truncate text-[11px] text-gray-500">
            {room.name_th}
          </div>
        )}
        {isOnline && laneCount > 1 && (
          <div className="text-[10px] text-indigo-600">{laneCount} ครู/คลาส</div>
        )}
      </div>

      {Array.from({ length: laneCount }, (_, laneIdx) =>
        Array.from({ length: SLOTS_PER_DAY }, (_, slotIdx) => (
          <DropCell
            key={`bg-${laneIdx}-${slotIdx}`}
            rowIndex={row + laneIdx}
            slotIndex={slotIdx}
            isDragging={isDragging}
            isOnline={isOnline}
            onDrop={onDrop(slotIdx)}
            onDragOver={onDragOver}
          />
        )),
      )}

      {events.map((ev) => {
        const range = eventSlotRange(ev.start_time, ev.end_time);
        if (!range) return null;
        const lane = getEventLane(ev.id);
        const liveCount =
          ev.class_code && enrollmentCounts
            ? enrollmentCounts[ev.class_code]
            : undefined;
        return (
          <EventBlock
            key={ev.id}
            event={ev}
            placement={{
              gridRow: row + lane,
              gridColumn: `${range.startSlot + 2} / span ${range.span}`,
            }}
            onClick={onClickEvent}
            onDragStart={onEventDragStart}
            onDragEnd={onEventDragEnd}
            liveStudentCount={liveCount}
          />
        );
      })}
    </>
  );
}

function DropCell({
  rowIndex,
  slotIndex,
  isDragging,
  isOnline,
  onDrop,
  onDragOver,
}: {
  rowIndex: number;
  slotIndex: number;
  isDragging: boolean;
  isOnline: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const [hover, setHover] = useState(false);
  const baseBg = isOnline
    ? slotIndex % 2 === 0
      ? "bg-indigo-50/40"
      : "bg-indigo-50/10"
    : slotIndex % 2 === 0
      ? "bg-gray-50/30"
      : "bg-white";
  const borderColor = isOnline ? "border-indigo-100" : "border-gray-100";
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
        `border-b ${borderColor} ${baseBg}`,
        isDragging ? "outline-dashed outline-1 outline-amber-200" : "",
        hover && isDragging ? "bg-amber-200/60 outline-amber-500" : "",
      ].join(" ")}
      style={{ gridRow: rowIndex, gridColumn: slotIndex + 2, height: ROW_PX }}
    />
  );
}

// ----------------------------------------------------------------------
// Lane allocation: greedy assignment so overlapping events get parallel rows.
// ----------------------------------------------------------------------

function assignLanes(
  events: EventWithRelations[],
): Map<string, number> {
  const sorted = [...events].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );
  const laneEnds: string[] = []; // last end_time per lane
  const out = new Map<string, number>();

  for (const ev of sorted) {
    let lane = laneEnds.findIndex((endTime) => endTime <= ev.start_time);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(ev.end_time);
    } else {
      laneEnds[lane] = ev.end_time;
    }
    out.set(ev.id, lane);
  }
  return out;
}

// ----------------------------------------------------------------------
// Waiting list panel
// ----------------------------------------------------------------------

function WaitingListPanel({
  pendings,
  draggingId,
  onDragStart,
  onDragEnd,
  onCreateClick,
}: {
  pendings: PendingBooking[];
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onCreateClick: () => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-amber-50/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            คลังรอจัดตาราง ({pendings.length})
          </div>
          {pendings.length > 0 && (
            <div className="text-[11px] text-gray-500">
              ลากการ์ด → วางในช่องเวลา/ห้อง
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onCreateClick}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          + คอร์สใหม่
        </button>
      </div>
      {pendings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-200 bg-white/60 px-3 py-4 text-center text-xs text-gray-500">
          ยังไม่มีดีลรอจัดตาราง — กด <span className="font-semibold">“+ คอร์สใหม่”</span> เพื่อสร้าง
        </div>
      ) : (
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
      )}
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
      title={`${pending.class_code} — ลากแล้ววางในช่องเวลาในตาราง`}
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
