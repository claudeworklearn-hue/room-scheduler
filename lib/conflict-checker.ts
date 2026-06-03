/**
 * Deterministic conflict checker.
 *
 * - Pure functions only. No I/O. No fetch. No LLM.
 * - Same input ⇒ same output, always.
 * - Source of truth for all schedule-validation logic in this app.
 *
 * Used by:
 *   1. SchedulePlannerAgent — filter recommendations before showing to user.
 *   2. commitScheduleWithValidation — last gate before any DB write.
 *   3. UI drag-drop — quick pre-check before round-tripping the server.
 *
 * Rules implemented (mirrors supabase/migrations/0008 + 0011):
 *   R1  room_overlap            same room + day + tsrange touch
 *   R2  tutor_overlap           same tutor + day + tsrange touch (skipped when online)
 *   R3  room_capacity           studentCount > room.capacity
 *   R4  outside_business_hours  outside the configured window
 *   R5  invalid_duration        endTime <= startTime, or bad format
 *   R6  tutor_skill_mismatch    requiredSubjects not subset of tutor.skills (warning)
 *   R7  room_unavailable        room status != active OR missing equipment OR maintenance
 *   R8  tutor_unavailable       outside tutor.availableSlots OR within unavailableSlots
 *                               OR exceeds max hours per day/week
 *
 * Date-bound checks (UnavailableSlot.date, weekly load) require the caller
 * to supply pre-aggregated tutor load. The template grid currently uses
 * dayOfWeek-only, so the load calculation operates over the current
 * weekly snapshot (existingEvents).
 */

import type {
  Conflict,
  ConflictCheckInput,
  ConflictCheckResult,
  ScheduleEvent,
  TimeString,
  Tutor,
  Room,
  ScheduleCandidate,
  DayOfWeek,
} from "./agents/types";

// ============================================================================
// Time helpers (intentionally local — keep this module dependency-free)
// ============================================================================

const HHMM_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export function toMinutes(t: TimeString): number {
  if (!HHMM_RE.test(t)) {
    throw new Error(`bad time format: "${t}" (expected HH:MM or HH:MM:SS)`);
  }
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/**
 * Half-open interval overlap test with optional buffer.
 *
 *   hasTimeOverlap("10:00", "12:00", "12:00", "14:00", 0)   // false  (back-to-back OK)
 *   hasTimeOverlap("10:00", "12:00", "12:05", "14:00", 15)  // true   (under buffer)
 *   hasTimeOverlap("10:00", "12:00", "12:15", "14:00", 15)  // false  (just OK)
 */
export function hasTimeOverlap(
  aStart: TimeString,
  aEnd: TimeString,
  bStart: TimeString,
  bEnd: TimeString,
  bufferMinutes = 0,
): boolean {
  const a1 = toMinutes(aStart);
  const a2 = toMinutes(aEnd) + bufferMinutes;
  const b1 = toMinutes(bStart);
  const b2 = toMinutes(bEnd) + bufferMinutes;
  return a1 < b2 && b1 < a2;
}

export function rangesOverlap(
  aStart: TimeString,
  aEnd: TimeString,
  bStart: TimeString,
  bEnd: TimeString,
): boolean {
  return hasTimeOverlap(aStart, aEnd, bStart, bEnd, 0);
}

// ============================================================================
// Public API (alphabetical by export name)
// ============================================================================

export interface BulkConflictCheckInput {
  candidates: ScheduleCandidate[];
  existingEvents: ScheduleEvent[];
  rooms?: Room[];
  tutors?: Tutor[];
  requiredSubjectsByCandidateIndex?: Record<number, string[]>;
  bufferMinutes?: number;
  businessHours?: { start: TimeString; end: TimeString };
}

export interface BulkConflictCheckResult {
  valid: boolean;
  conflicts: Conflict[];
  warnings: Conflict[];
  summary: string;
  blockingConflictCount: number;
  warningCount: number;
  /** Per-candidate breakdown, keyed by index in input.candidates */
  perCandidate: Record<number, ConflictCheckResult>;
}

/**
 * Conflict check for ONE candidate against an existing world snapshot.
 * Re-exported under the name from Phase-2 spec for clarity.
 */
export function checkSingleScheduleEvent(
  candidate: ScheduleCandidate,
  context: {
    existingEvents: ScheduleEvent[];
    room?: Room | null;
    tutor?: Tutor | null;
    requiredSubjects?: string[];
    requiredEquipment?: string[];
    bufferMinutes?: number;
    businessHours?: { start: TimeString; end: TimeString };
  },
): Conflict[] {
  return checkConflicts({
    candidate,
    existingEvents: context.existingEvents,
    room: context.room,
    tutor: context.tutor,
    requiredSubjects: context.requiredSubjects,
    requiredEquipment: context.requiredEquipment,
    bufferMinutes: context.bufferMinutes,
    businessHours: context.businessHours,
  }).conflicts;
}

/**
 * Bulk check — both candidate-vs-existing AND candidate-vs-candidate.
 * Used by Import/Sync Agent before staging an apply, and by Phase-13 UI
 * when a user drops several pendings at once.
 */
export function checkBulkScheduleEvents(
  input: BulkConflictCheckInput,
): BulkConflictCheckResult {
  const perCandidate: Record<number, ConflictCheckResult> = {};
  const all: Conflict[] = [];
  const buffer = input.bufferMinutes ?? 0;

  // First pass: each candidate vs the existing world.
  input.candidates.forEach((c, idx) => {
    const room = c.roomId
      ? input.rooms?.find((r) => r.id === c.roomId) ?? null
      : null;
    const tutor = c.tutorId
      ? input.tutors?.find((t) => t.id === c.tutorId) ?? null
      : null;
    const result = checkConflicts({
      candidate: c,
      existingEvents: input.existingEvents,
      room,
      tutor,
      requiredSubjects: input.requiredSubjectsByCandidateIndex?.[idx],
      bufferMinutes: buffer,
      businessHours: input.businessHours,
    });
    perCandidate[idx] = result;
    all.push(...result.conflicts);
  });

  // Second pass: candidates vs each other (room and tutor only).
  for (let i = 0; i < input.candidates.length; i++) {
    for (let j = i + 1; j < input.candidates.length; j++) {
      const a = input.candidates[i];
      const b = input.candidates[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (!hasTimeOverlap(a.startTime, a.endTime, b.startTime, b.endTime, buffer)) {
        continue;
      }
      if (a.roomId && a.roomId === b.roomId) {
        const cf: Conflict = {
          type: "room_overlap",
          severity: "error",
          message: `แถวที่ ${i + 1} กับ ${j + 1} จะใช้ห้องเดียวกันในเวลาทับกัน`,
          affectedEntityType: "room",
          affectedEntityId: a.roomId,
          relatedScheduleEventIds: [],
          suggestedFix: "เลื่อนแถวใดแถวหนึ่งหรือเปลี่ยนห้อง",
        };
        perCandidate[i].conflicts.push(cf);
        perCandidate[j].conflicts.push(cf);
        all.push(cf);
      }
      if (
        a.tutorId &&
        a.tutorId === b.tutorId &&
        a.deliveryMode !== "online" &&
        b.deliveryMode !== "online"
      ) {
        const cf: Conflict = {
          type: "tutor_overlap",
          severity: "error",
          message: `แถวที่ ${i + 1} กับ ${j + 1} ครูคนเดียวกันสอนเวลาทับ`,
          affectedEntityType: "tutor",
          affectedEntityId: a.tutorId,
          relatedScheduleEventIds: [],
          suggestedFix: "เลื่อนเวลา หรือสลับครู",
        };
        perCandidate[i].conflicts.push(cf);
        perCandidate[j].conflicts.push(cf);
        all.push(cf);
      }
    }
  }

  for (const idx of Object.keys(perCandidate).map(Number)) {
    perCandidate[idx].isValid = !perCandidate[idx].conflicts.some(
      (c) => c.severity === "error",
    );
  }

  const errors = all.filter((c) => c.severity === "error");
  const warnings = all.filter((c) => c.severity === "warning");
  return {
    valid: errors.length === 0,
    conflicts: errors,
    warnings,
    summary: errors.length
      ? `ตรวจพบ ${errors.length} ความขัดแย้ง · ${warnings.length} คำเตือน`
      : `ตรวจผ่าน — ${warnings.length} คำเตือนเท่านั้น`,
    blockingConflictCount: errors.length,
    warningCount: warnings.length,
    perCandidate,
  };
}

/**
 * Tutor workload summary for a given window. Phase-2 spec asks for both
 * a daily and weekly view; we expose both via a single struct.
 */
export interface TutorLoadSummary {
  tutorId: string;
  dayOfWeek: DayOfWeek | null;
  hoursOnDay: number | null;
  hoursInWeek: number;
  classesOnDay: number | null;
  classesInWeek: number;
  exceedsDailyMax: boolean;
  exceedsWeeklyMax: boolean;
  /** Remaining hours before hitting the weekly cap. Can be negative. */
  weeklyRemaining: number;
}

export function calculateTutorLoad(
  tutorId: string,
  events: ScheduleEvent[],
  options: {
    tutor?: Tutor | null;
    dayOfWeek?: DayOfWeek;
  } = {},
): TutorLoadSummary {
  const tutor = options.tutor ?? null;
  const tutorEvents = events.filter(
    (e) => e.tutorId === tutorId && e.status !== "cancelled",
  );
  let hoursInWeek = 0;
  for (const e of tutorEvents) {
    hoursInWeek += eventHours(e);
  }
  let hoursOnDay: number | null = null;
  let classesOnDay: number | null = null;
  if (options.dayOfWeek != null) {
    const dayEvents = tutorEvents.filter(
      (e) => e.dayOfWeek === options.dayOfWeek,
    );
    classesOnDay = dayEvents.length;
    hoursOnDay = dayEvents.reduce((s, e) => s + eventHours(e), 0);
  }
  const maxDay = tutor?.maxHoursPerDay ?? Infinity;
  const maxWeek = tutor?.maxHoursPerWeek ?? Infinity;
  return {
    tutorId,
    dayOfWeek: options.dayOfWeek ?? null,
    hoursOnDay,
    hoursInWeek,
    classesOnDay,
    classesInWeek: tutorEvents.length,
    exceedsDailyMax: hoursOnDay != null && hoursOnDay > maxDay,
    exceedsWeeklyMax: hoursInWeek > maxWeek,
    weeklyRemaining: Number.isFinite(maxWeek) ? maxWeek - hoursInWeek : Infinity,
  };
}

/**
 * Phase-2 spec name. Equivalent to checkConflicts + a richer summary.
 */
export function checkScheduleConflicts(
  input: ConflictCheckInput,
): BulkConflictCheckResult {
  const single = checkConflicts(input);
  const errors = single.conflicts.filter((c) => c.severity === "error");
  const warnings = single.conflicts.filter((c) => c.severity === "warning");
  return {
    valid: single.isValid,
    conflicts: errors,
    warnings,
    summary: single.isValid
      ? `ตรวจผ่าน${warnings.length ? ` (${warnings.length} คำเตือน)` : ""}`
      : `ตรวจพบ ${errors.length} ความขัดแย้ง`,
    blockingConflictCount: errors.length,
    warningCount: warnings.length,
    perCandidate: { 0: single },
  };
}

// ============================================================================
// Core check — single candidate
// ============================================================================

const DEFAULT_BUSINESS_HOURS = { start: "08:00", end: "23:00" };

export function checkConflicts(
  input: ConflictCheckInput & { bufferMinutes?: number },
): ConflictCheckResult {
  const conflicts: Conflict[] = [];
  const c = input.candidate;
  const candidateId = c.id ?? "(new)";
  const buffer = input.bufferMinutes ?? 0;

  // R5 — Parse + duration sanity
  let durMin = 0;
  try {
    durMin = toMinutes(c.endTime) - toMinutes(c.startTime);
  } catch (err) {
    conflicts.push({
      type: "invalid_duration",
      severity: "error",
      message: `เวลาไม่ถูก format: ${(err as Error).message}`,
      affectedEntityType: "schedule_event",
      affectedEntityId: candidateId,
      relatedScheduleEventIds: [],
      suggestedFix: "ใช้ format HH:MM (เช่น 17:30) หรือ HH:MM:SS",
    });
    return finalize(conflicts);
  }
  if (durMin <= 0) {
    conflicts.push({
      type: "invalid_duration",
      severity: "error",
      message: "เวลาจบต้องมากกว่าเวลาเริ่ม",
      affectedEntityType: "schedule_event",
      affectedEntityId: candidateId,
      relatedScheduleEventIds: [],
      suggestedFix: "เปลี่ยน endTime ให้อยู่หลัง startTime อย่างน้อย 30 นาที",
    });
  }

  // R4 — Business hours
  const bh = input.businessHours ?? DEFAULT_BUSINESS_HOURS;
  if (
    toMinutes(c.startTime) < toMinutes(bh.start) ||
    toMinutes(c.endTime) > toMinutes(bh.end)
  ) {
    conflicts.push({
      type: "outside_business_hours",
      severity: "error",
      message: `อยู่นอกช่วงเปิดทำการ (${bh.start}–${bh.end})`,
      affectedEntityType: "schedule_event",
      affectedEntityId: candidateId,
      relatedScheduleEventIds: [],
      suggestedFix: `เลื่อนเวลาเข้าช่วง ${bh.start}–${bh.end}`,
    });
  }

  // R1 — Room overlap
  if (c.roomId) {
    for (const e of input.existingEvents) {
      if (e.id === c.id) continue;
      if (e.roomId !== c.roomId) continue;
      if (e.dayOfWeek !== c.dayOfWeek) continue;
      if (e.status === "cancelled") continue;
      if (!hasTimeOverlap(c.startTime, c.endTime, e.startTime, e.endTime, buffer)) continue;
      conflicts.push(buildOverlap("room_overlap", "room", c.roomId, e));
    }
  }

  // R2 — Tutor overlap (skip when online; matches DB 0011)
  if (c.tutorId && c.deliveryMode !== "online") {
    for (const e of input.existingEvents) {
      if (e.id === c.id) continue;
      if (e.tutorId !== c.tutorId) continue;
      if (e.dayOfWeek !== c.dayOfWeek) continue;
      if (e.status === "cancelled") continue;
      if (e.deliveryMode === "online") continue;
      if (!hasTimeOverlap(c.startTime, c.endTime, e.startTime, e.endTime, buffer)) continue;
      conflicts.push(buildOverlap("tutor_overlap", "tutor", c.tutorId, e));
    }
  }

  // R3 — Room capacity + R7 status
  if (input.room) {
    if (input.room.status === "inactive" || input.room.status === "maintenance") {
      conflicts.push({
        type: "room_unavailable",
        severity: "error",
        message: `ห้อง ${input.room.name} อยู่ในสถานะ ${input.room.status === "maintenance" ? "ปิดซ่อม" : "ไม่ใช้งาน"}`,
        affectedEntityType: "room",
        affectedEntityId: input.room.id,
        relatedScheduleEventIds: [],
        suggestedFix: "เลือกห้องอื่น",
      });
    }
    if (c.studentCount != null && input.room.capacity > 0) {
      if (c.studentCount > input.room.capacity) {
        conflicts.push({
          type: "room_capacity",
          severity: "error",
          message: `จำนวนนักเรียน ${c.studentCount} เกินความจุห้อง ${input.room.capacity}`,
          affectedEntityType: "room",
          affectedEntityId: input.room.id,
          relatedScheduleEventIds: [],
          suggestedFix: "เลือกห้องที่จุได้มากกว่า หรือลดจำนวน",
        });
      }
    }
    // Room unavailable slot (date-bound) — best-effort; the template grid
    // doesn't carry a date on the candidate, so this only fires when the
    // caller passes an explicit date upstream. Out of scope for the
    // template grid today.
  }

  // R6 — Tutor skill mismatch (warning)
  if (input.tutor && input.requiredSubjects?.length) {
    const missing = input.requiredSubjects.filter(
      (s) => !input.tutor!.skills.includes(s),
    );
    if (missing.length) {
      conflicts.push({
        type: "tutor_skill_mismatch",
        severity: "warning",
        message: `${input.tutor.name} ไม่ได้ลงทะเบียนสอนวิชา: ${missing.join(", ")}`,
        affectedEntityType: "tutor",
        affectedEntityId: input.tutor.id,
        relatedScheduleEventIds: [],
        suggestedFix: "เลือกครูคนอื่น หรืออัพเดท skills ของครูใน /admin/tutors",
      });
    }
  }

  // R7 — Room equipment missing
  if (input.room && input.requiredEquipment?.length) {
    const missing = input.requiredEquipment.filter(
      (e) => !input.room!.equipment.includes(e),
    );
    if (missing.length) {
      conflicts.push({
        type: "room_unavailable",
        severity: "warning",
        message: `ห้อง ${input.room.name} ไม่มีอุปกรณ์: ${missing.join(", ")}`,
        affectedEntityType: "room",
        affectedEntityId: input.room.id,
        relatedScheduleEventIds: [],
        suggestedFix: "เลือกห้องที่มีอุปกรณ์ครบ หรือเพิ่มอุปกรณ์ในห้องนี้",
      });
    }
  }

  // R8 — Tutor unavailable + overload
  if (input.tutor && c.tutorId) {
    // (a) Outside the tutor's recurring availability windows.
    if (input.tutor.availableSlots.length > 0) {
      const inWindow = input.tutor.availableSlots.some(
        (s) =>
          s.dayOfWeek === c.dayOfWeek &&
          toMinutes(c.startTime) >= toMinutes(s.startTime) &&
          toMinutes(c.endTime) <= toMinutes(s.endTime),
      );
      if (!inWindow) {
        conflicts.push({
          type: "tutor_unavailable",
          severity: "warning",
          message: `${input.tutor.name} ไม่ได้ระบุว่าว่างในช่วงนี้`,
          affectedEntityType: "tutor",
          affectedEntityId: input.tutor.id,
          relatedScheduleEventIds: [],
          suggestedFix: "เช็คกับครูก่อน หรือเพิ่ม availability slot",
        });
      }
    }
    // (b) Weekly / daily load.
    const load = calculateTutorLoad(c.tutorId, input.existingEvents, {
      tutor: input.tutor,
      dayOfWeek: c.dayOfWeek,
    });
    const hoursThisCandidate = durMin / 60;
    if (load.hoursInWeek + hoursThisCandidate > input.tutor.maxHoursPerWeek) {
      conflicts.push({
        type: "tutor_unavailable",
        severity: "warning",
        message: `จะทำให้ ${input.tutor.name} เกิน max ${input.tutor.maxHoursPerWeek} ชม./สัปดาห์`,
        affectedEntityType: "tutor",
        affectedEntityId: input.tutor.id,
        relatedScheduleEventIds: [],
        suggestedFix: "เลือกครูคนอื่นที่ load น้อยกว่า",
      });
    }
    if (
      load.hoursOnDay != null &&
      load.hoursOnDay + hoursThisCandidate > input.tutor.maxHoursPerDay
    ) {
      conflicts.push({
        type: "tutor_unavailable",
        severity: "warning",
        message: `จะทำให้ ${input.tutor.name} เกิน max ${input.tutor.maxHoursPerDay} ชม./วัน`,
        affectedEntityType: "tutor",
        affectedEntityId: input.tutor.id,
        relatedScheduleEventIds: [],
        suggestedFix: "ลดชั่วโมง หรือเลือกครูคนอื่น",
      });
    }
  }

  return finalize(conflicts);
}

// ============================================================================
// internals
// ============================================================================

function buildOverlap(
  type: "room_overlap" | "tutor_overlap",
  entityType: "room" | "tutor",
  entityId: string,
  conflicting: ScheduleEvent,
): Conflict {
  const range = `${conflicting.startTime.slice(0, 5)}–${conflicting.endTime.slice(0, 5)}`;
  const subject = type === "room_overlap" ? "ห้องนี้" : "ครูคนนี้";
  return {
    type,
    severity: "error",
    message: `${subject}ทับเวลากับคลาส "${conflicting.title}" (${range})`,
    affectedEntityType: entityType,
    affectedEntityId: entityId,
    relatedScheduleEventIds: [conflicting.id],
    suggestedFix:
      type === "room_overlap"
        ? "เลือกห้องอื่นหรือเลื่อนเวลา"
        : "เลือกครูคนอื่น หรือเลื่อนเวลา (online ครูซ้อนได้)",
  };
}

function eventHours(e: ScheduleEvent): number {
  return (toMinutes(e.endTime) - toMinutes(e.startTime)) / 60;
}

function finalize(conflicts: Conflict[]): ConflictCheckResult {
  const isValid = !conflicts.some((c) => c.severity === "error");
  return { conflicts, isValid };
}
