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
const DEFAULT_BUSINESS_HOURS = { start: "08:00", end: "23:00" };

// ============================================================================
// Input world (slim — only what availability needs, NO PII fields)
// ============================================================================

export interface AvailTutor {
  id: string;
  name: string;
  subjects: string[];
  closedDaysForNew: DayOfWeek[];
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
  const bh = params.businessHours ?? DEFAULT_BUSINESS_HOURS;
  const window: Interval = { start: toMinutes(bh.start), end: toMinutes(bh.end) };

  const rooms = world.rooms.filter((r) => r.capacity >= minCap);
  const tutors = world.tutors.filter((t) =>
    t.subjects.some((s) => s.trim().toLowerCase() === subject),
  );

  const result: TutorAvailability[] = [];

  for (const tutor of tutors) {
    for (const day of days) {
      if (tutor.closedDaysForNew.includes(day)) continue;

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

      const tutorFree = subtractIntervals(window, tutorBusy).filter(
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
          freeSlots,
        });
      }
    }
  }

  return result;
}
