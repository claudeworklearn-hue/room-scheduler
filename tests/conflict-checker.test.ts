/**
 * Conflict-checker test suite — runnable via `npx tsx tests/conflict-checker.test.ts`.
 *
 * Covers the 10 scenarios from Phase-15:
 *   1. room overlap
 *   2. tutor overlap
 *   3. room capacity
 *   4. tutor skill mismatch
 *   5. tutor unavailable (weekly overload)
 *   6. room maintenance
 *   7. invalid time
 *   8. back-to-back OK when buffer=0
 *   9. back-to-back blocked when buffer>0
 *  10. bulk internal conflict
 */

import {
  checkConflicts,
  checkBulkScheduleEvents,
  checkSingleScheduleEvent,
  hasTimeOverlap,
  calculateTutorLoad,
} from "../lib/conflict-checker";
import type {
  Room,
  ScheduleCandidate,
  ScheduleEvent,
  Tutor,
  ConflictType,
} from "../lib/agents/types";

let passed = 0;
let failed = 0;

function ok(label: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    // eslint-disable-next-line no-console
    console.error(`  ✗ ${label}`, detail ?? "");
  }
}

function has(types: ConflictType[], want: ConflictType): boolean {
  return types.includes(want);
}

// ── fixture helpers
const baseRoom = (id: string, capacity = 20, status: Room["status"] = "active"): Room => ({
  id,
  name: `Room ${id}`,
  capacity,
  equipment: ["whiteboard"],
  status,
  unavailableSlots: [],
  notes: null,
});

const baseTutor = (id: string, skills: string[] = ["math"]): Tutor => ({
  id,
  name: `Tutor ${id}`,
  shortCode: id,
  skills,
  availableSlots: [],
  unavailableSlots: [],
  maxHoursPerDay: 8,
  maxHoursPerWeek: 24,
  status: "active",
  color: null,
  role: "tutor",
});

const baseEvent = (over: Partial<ScheduleEvent>): ScheduleEvent => ({
  id: "ev",
  dealId: null,
  courseId: null,
  roomId: null,
  tutorId: null,
  title: "ev",
  date: null,
  dayOfWeek: 1,
  startTime: "10:00:00",
  endTime: "12:00:00",
  durationMinutes: 120,
  studentCount: null,
  status: "confirmed",
  source: "manual",
  createdBy: null,
  updatedBy: null,
  ...over,
});

const candidate = (over: Partial<ScheduleCandidate>): ScheduleCandidate => ({
  dayOfWeek: 1,
  startTime: "11:00",
  endTime: "13:00",
  roomId: null,
  tutorId: null,
  ...over,
});

// ── 1. room overlap
{
  console.log("\n1) room overlap (10:00-12:00 vs 11:00-13:00)");
  const existing = [baseEvent({ id: "A", roomId: "R1", startTime: "10:00:00", endTime: "12:00:00" })];
  const res = checkConflicts({
    candidate: candidate({ roomId: "R1", startTime: "11:00", endTime: "13:00" }),
    existingEvents: existing,
    room: baseRoom("R1"),
  });
  ok("blocks with room_overlap", has(res.conflicts.map((c) => c.type), "room_overlap"));
  ok("isValid=false", !res.isValid);
}

// ── 2. tutor overlap
{
  console.log("\n2) tutor overlap onsite");
  const existing = [baseEvent({ id: "A", tutorId: "T1", startTime: "10:00:00", endTime: "12:00:00", deliveryMode: "onsite" })];
  const res = checkConflicts({
    candidate: candidate({ tutorId: "T1", startTime: "11:00", endTime: "13:00", deliveryMode: "onsite" }),
    existingEvents: existing,
    tutor: baseTutor("T1"),
  });
  ok("blocks with tutor_overlap", has(res.conflicts.map((c) => c.type), "tutor_overlap"));
}

// ── 3. room capacity
{
  console.log("\n3) room capacity 15 < students 20");
  const res = checkConflicts({
    candidate: candidate({ roomId: "R1", studentCount: 20 }),
    existingEvents: [],
    room: baseRoom("R1", 15),
  });
  ok("blocks with room_capacity", has(res.conflicts.map((c) => c.type), "room_capacity"));
}

// ── 4. tutor skill mismatch
{
  console.log("\n4) tutor skill mismatch (math only, need physics)");
  const res = checkConflicts({
    candidate: candidate({ tutorId: "T1" }),
    existingEvents: [],
    tutor: baseTutor("T1", ["math"]),
    requiredSubjects: ["physics"],
  });
  ok("warns with tutor_skill_mismatch", has(res.conflicts.map((c) => c.type), "tutor_skill_mismatch"));
  ok("still isValid (warning only)", res.isValid);
}

// ── 5. tutor weekly overload
{
  console.log("\n5) tutor weekly overload");
  const heavy: ScheduleEvent[] = [];
  // 30 hours already
  for (let i = 0; i < 15; i++) {
    heavy.push(
      baseEvent({
        id: `E${i}`,
        tutorId: "T1",
        dayOfWeek: 3,
        startTime: "08:00:00",
        endTime: "10:00:00",
      }),
    );
  }
  const tutor = baseTutor("T1");
  const load = calculateTutorLoad("T1", heavy, { tutor });
  ok("load > weekly max", load.hoursInWeek > tutor.maxHoursPerWeek);
  const res = checkConflicts({
    candidate: candidate({ tutorId: "T1" }),
    existingEvents: heavy,
    tutor,
  });
  ok("warns with tutor_unavailable", has(res.conflicts.map((c) => c.type), "tutor_unavailable"));
}

// ── 6. room maintenance
{
  console.log("\n6) room in maintenance");
  const res = checkConflicts({
    candidate: candidate({ roomId: "R1" }),
    existingEvents: [],
    room: baseRoom("R1", 20, "maintenance"),
  });
  ok("blocks with room_unavailable", has(res.conflicts.map((c) => c.type), "room_unavailable"));
}

// ── 7. invalid time
{
  console.log("\n7) end before start");
  const res = checkConflicts({
    candidate: candidate({ startTime: "12:00", endTime: "10:00" }),
    existingEvents: [],
  });
  ok("blocks with invalid_duration", has(res.conflicts.map((c) => c.type), "invalid_duration"));
}

// ── 8. back-to-back with buffer 0
{
  console.log("\n8) back-to-back (12:00 vs 12:00) buffer=0");
  ok("no overlap reported", !hasTimeOverlap("10:00", "12:00", "12:00", "14:00", 0));
}

// ── 9. back-to-back with buffer 15
{
  console.log("\n9) back-to-back (12:05 vs 14:00) buffer=15");
  ok("overlap reported", hasTimeOverlap("10:00", "12:00", "12:05", "14:00", 15));
}

// ── 10. bulk internal conflict
{
  console.log("\n10) bulk: two new candidates share room+time");
  const bulk = checkBulkScheduleEvents({
    candidates: [
      candidate({ roomId: "R1", startTime: "10:00", endTime: "11:30" }),
      candidate({ roomId: "R1", startTime: "11:00", endTime: "12:30" }),
    ],
    existingEvents: [],
    rooms: [baseRoom("R1")],
  });
  ok("flags internal room_overlap", bulk.blockingConflictCount > 0);
  ok("valid=false", !bulk.valid);
}

// ── Misc smoke
{
  const single = checkSingleScheduleEvent(candidate({}), { existingEvents: [] });
  ok("smoke: empty world ⇒ no conflicts", single.length === 0);
}

// ── summary
console.log(`\n${passed} passed · ${failed} failed`);
if (failed > 0) process.exit(1);
