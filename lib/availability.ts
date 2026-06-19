/**
 * Availability core — PURE, no I/O.
 *
 * Finds free teaching slots for a subject: a tutor who teaches that subject
 * is free, AND at least one room is free for the whole slot. Designed to be
 * reused by BOTH:
 *   1. GET /api/availability   — the LINE chatbot (ซันจิ) calls this
 *   2. the booking web page     — phase 2 (calls computeAvailability directly)
 *
 * Returns ONLY free time windows + room shells (id/name/capacity).
 * It never reads student_names / title / any PII — so its output is always
 * safe to hand to the chatbot / parents.
 *
 * Time model: weekly template (dayOfWeek + HH:MM). Date-bound / holidays are
 * a later phase; for now closed_days_for_new is honoured per tutor.
 */
import { toMinutes } from "./conflict-checker";
import type { DayOfWeek, TimeString } from "./agents/types";

const ALL_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * เวลาเปิดห้อง (operating hours) ต่อวัน — เสนอ slot ได้เฉพาะในช่วงนี้.
 * จากแป้ง (ผ่านซันจิ): จ–ศ 16:00–22:00 · ส–อา 08:00–22:00.
 * แก้ที่นี่ถ้าเวลาเปลี่ยน. caller ส่ง params.businessHours มา override
 * (ใช้เท่ากันทุกวัน) ได้ — สำหรับ test/ความยืดหยุ่น.
 */
const OPERATING_HOURS: Record<DayOfWeek, { start: TimeString; end: TimeString }> = {
  1: { start: "16:00", end: "22:00" }, // จันทร์
  2: { start: "16:00", end: "22:00" }, // อังคาร
  3: { start: "16:00", end: "22:00" }, // พุธ
  4: { start: "16:00", end: "22:00" }, // พฤหัส
  5: { start: "16:00", end: "22:00" }, // ศุกร์
  6: { start: "08:00", end: "22:00" }, // เสาร์
  7: { start: "08:00", end: "22:00" }, // อาทิตย์
};

/**
 * คำเตือนสถานะ slot (human-readable) — ตารางครูแสดงเฉพาะ "คอร์สกลุ่ม" ดังนั้น
 * "ช่องว่าง" = ไม่มีคอร์สกลุ่มช่วงนั้น ไม่ใช่ "ครูยืนยันรับสอนเดี่ยว".
 * บอท/เว็บต้องแสดงป้ายนี้กัน ผปค เข้าใจผิดว่า "ยืนยันแล้ว".
 */
const TENTATIVE_NOTE =
  "ว่างตามตารางคอร์สกลุ่ม — ยังไม่ยืนยันว่าครูรับสอนเดี่ยวช่วงนี้ ต้องยืนยันกับครูก่อนปิดดีล";

// ============================================================================
// Input world (slim — only what availability needs, NO PII fields)
// ============================================================================

export interface AvailTutor {
  id: string;
  name: string;
  subjects: string[];
  closedDaysForNew: DayOfWeek[];
  /** ครูรับสอนคอร์สเดี่ยวไหม — false = ไม่เสนอครูคนนี้เลยในการจองเดี่ยว (undefined = รับ). */
  acceptsPrivate?: boolean;
  /** ช่วงเวลาที่ครู "ไม่รับสอน" รายสัปดาห์ (blackout) — availability ตัดออกเหมือนมีคาบกั้น. */
  blackouts?: { dayOfWeek: DayOfWeek; start: TimeString; end: TimeString }[];
}

export interface AvailRoom {
  id: string;
  name: string;
  capacity: number;
}

export interface AvailEvent {
  tutorId: string | null;
  roomId: string | null;
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
  status: string;
  deliveryMode?: string | null;
}

export interface AvailWorld {
  tutors: AvailTutor[];
  rooms: AvailRoom[];
  events: AvailEvent[];
}

// ============================================================================
// Params + output
// ============================================================================

export interface AvailabilityParams {
  /** subject key (physics / chem / bio / math / science / english …). */
  subject: string;
  /** required slot length in minutes (e.g. 90, 120). */
  durationMin: number;
  /** restrict to these weekdays; default all 7. */
  days?: DayOfWeek[];
  /** only rooms with capacity >= this; default 1. */
  minCapacity?: number;
  businessHours?: { start: TimeString; end: TimeString };
}

export interface RoomLite {
  roomId: string;
  name: string;
  capacity: number;
}

export interface FreeSlot {
  start: TimeString;
  end: TimeString;
  /** rooms free for the WHOLE slot. */
  rooms: RoomLite[];
}

export interface TutorAvailability {
  tutorId: string;
  tutorName: string;
  dayOfWeek: DayOfWeek;
  /**
   * "calendar-free" = ว่างตามตาราง (ไม่มีคลาสชน + ห้องว่าง + ในเวลาเปิดห้อง)
   * แต่ยังไม่ผ่านการยืนยันจากครู → ฝั่งบอท/เว็บต้องถือเป็น tentative และให้
   * แอดมิน/ครูยืนยันก่อนปิดดีล (เฟส 2 จะมีสถานะ "tutor-confirmed").
   */
  confidence: "calendar-free";
  /** human-readable คำเตือนสถานะ (= TENTATIVE_NOTE) — ให้บอท/เว็บแสดงกัน ผปค เข้าใจผิดว่า "ยืนยันแล้ว". */
  note: string;
  freeSlots: FreeSlot[];
}

// ============================================================================
// internals
// ============================================================================

interface Interval {
  start: number; // minutes from midnight
  end: number;
}

function minToTime(min: number): TimeString {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function eventInterval(e: AvailEvent): Interval {
  return { start: toMinutes(e.startTime), end: toMinutes(e.endTime) };
}

function isActive(e: AvailEvent): boolean {
  return e.status !== "cancelled";
}

/** `window` minus `busy` intervals → sorted free intervals (minutes). */
function subtractIntervals(window: Interval, busy: Interval[]): Interval[] {
  const clipped = busy
    .filter((b) => b.end > window.start && b.start < window.end)
    .map((b) => ({
      start: Math.max(b.start, window.start),
      end: Math.min(b.end, window.end),
    }))
    .sort((a, b) => a.start - b.start);

  const free: Interval[] = [];
  let cursor = window.start;
  for (const b of clipped) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

// ============================================================================
// Public
// ============================================================================

export function computeAvailability(
  params: AvailabilityParams,
  world: AvailWorld,
): TutorAvailability[] {
  const subject = params.subject.trim().toLowerCase();
  const duration = params.durationMin;
  const days = params.days?.length ? params.days : ALL_DAYS;
  const minCap = params.minCapacity ?? 1;

  const rooms = world.rooms.filter((r) => r.capacity >= minCap);
  const tutors = world.tutors.filter(
    (t) =>
      t.acceptsPrivate !== false && // ครูที่ไม่รับสอนเดี่ยว → ไม่เสนอเลย
      t.subjects.some((s) => s.trim().toLowerCase() === subject),
  );

  const result: TutorAvailability[] = [];

  for (const tutor of tutors) {
    for (const day of days) {
      if (tutor.closedDaysForNew.includes(day)) continue;

      // Operating hours for this weekday (จ–ศ 16–22, ส–อา 08–22).
      const dayBh = params.businessHours ?? OPERATING_HOURS[day];
      const window: Interval = { start: toMinutes(dayBh.start), end: toMinutes(dayBh.end) };

      // Tutor's busy intervals this weekday (onsite/hybrid block; online does not).
      const tutorBusy = world.events
        .filter(
          (e) =>
            e.tutorId === tutor.id &&
            e.dayOfWeek === day &&
            isActive(e) &&
            e.deliveryMode !== "online",
        )
        .map(eventInterval);

      // Blackout windows ที่ครูตั้งว่า "ไม่รับสอน" วันนี้ → ปิดเหมือนมีคาบกั้น
      const blackoutBusy = (tutor.blackouts ?? [])
        .filter((b) => b.dayOfWeek === day)
        .map((b) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }));

      const tutorFree = subtractIntervals(window, [...tutorBusy, ...blackoutBusy]).filter(
        (iv) => iv.end - iv.start >= duration,
      );

      const freeSlots: FreeSlot[] = [];
      for (const iv of tutorFree) {
        // Rooms with NO event overlapping this whole free interval.
        const roomsFree = rooms.filter(
          (room) =>
            !world.events.some((e) => {
              if (e.roomId !== room.id) return false;
              if (e.dayOfWeek !== day) return false;
              if (!isActive(e)) return false;
              const ev = eventInterval(e);
              return ev.start < iv.end && iv.start < ev.end; // half-open overlap
            }),
        );
        if (roomsFree.length === 0) continue; // no room → not offerable
        freeSlots.push({
          start: minToTime(iv.start),
          end: minToTime(iv.end),
          rooms: roomsFree.map((r) => ({
            roomId: r.id,
            name: r.name,
            capacity: r.capacity,
          })),
        });
      }

      if (freeSlots.length > 0) {
        result.push({
          tutorId: tutor.id,
          tutorName: tutor.name,
          dayOfWeek: day,
          confidence: "calendar-free",
          note: TENTATIVE_NOTE,
          freeSlots,
        });
      }
    }
  }

  return result;
}
