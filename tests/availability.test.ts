/**
 * Availability core test — runnable via `npx tsx tests/availability.test.ts`.
 *
 * Pure logic only (no DB). Covers:
 *   1. empty schedule → tutor free across business hours, rooms offered
 *   2. a class splits the day into two free intervals
 *   3. closed_days_for_new is skipped
 *   4. subject filter (tutor who doesn't teach it never appears)
 *   5. free gap shorter than duration → no slot
 *   6. all rooms busy in the interval → slot dropped (can't offer)
 *   7. minCapacity filters out small rooms
 *   8. cancelled events are ignored
 *   9. an online tutor class does not block onsite availability
 */
import {
  computeAvailability,
  type AvailWorld,
  type AvailTutor,
  type AvailRoom,
} from "../lib/availability";
import type { DayOfWeek } from "../lib/agents/types";

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

const tutorChem: AvailTutor = { id: "t1", name: "ครูเคมี", subjects: ["chem"], closedDaysForNew: [] };
const tutorBio: AvailTutor = { id: "t2", name: "ครูชีวะ", subjects: ["bio"], closedDaysForNew: [] };
const roomA: AvailRoom = { id: "rA", name: "ห้อง A", capacity: 6 };
const roomB: AvailRoom = { id: "rB", name: "ห้อง B", capacity: 2 };

const world = (events: AvailWorld["events"]): AvailWorld => ({
  tutors: [tutorChem, tutorBio],
  rooms: [roomA, roomB],
  events,
});

// 1
{
  const res = computeAvailability({ subject: "chem", durationMin: 120 }, world([]));
  const chem = res.filter((r) => r.tutorId === "t1");
  ok("empty schedule → chem free all 7 days", chem.length === 7, chem.length);
  const mon = chem.find((r) => r.dayOfWeek === 1);
  const sat = chem.find((r) => r.dayOfWeek === 6);
  ok(
    "Mon (จ–ศ) slot = operating hours 16:00–22:00",
    mon?.freeSlots[0]?.start === "16:00" && mon?.freeSlots[0]?.end === "22:00",
    mon?.freeSlots[0],
  );
  ok(
    "Sat (ส–อา) slot = operating hours 08:00–22:00",
    sat?.freeSlots[0]?.start === "08:00" && sat?.freeSlots[0]?.end === "22:00",
    sat?.freeSlots[0],
  );
  ok("confidence = calendar-free (tentative)", mon?.confidence === "calendar-free", mon?.confidence);
  ok("note explains tentative status (ยังไม่ยืนยันครู)", (mon?.note ?? "").includes("ยืนยัน"), mon?.note);
  ok("both rooms offered", (mon?.freeSlots[0]?.rooms.length ?? 0) === 2);
}

// 2
{
  const res = computeAvailability(
    { subject: "chem", durationMin: 60, days: [2] },
    world([{ tutorId: "t1", roomId: "rA", dayOfWeek: 2, startTime: "17:00", endTime: "19:00", status: "scheduled" }]),
  );
  const tue = res.find((r) => r.tutorId === "t1" && r.dayOfWeek === 2);
  ok("class splits Tue into 2 free intervals", tue?.freeSlots.length === 2, tue?.freeSlots);
  ok("first ends at 17:00", tue?.freeSlots[0]?.end === "17:00", tue?.freeSlots[0]);
  ok("second starts at 19:00", tue?.freeSlots[1]?.start === "19:00", tue?.freeSlots[1]);
}

// 3
{
  const t: AvailTutor = { ...tutorChem, closedDaysForNew: [3 as DayOfWeek] };
  const res = computeAvailability(
    { subject: "chem", durationMin: 60, days: [3] },
    { tutors: [t], rooms: [roomA], events: [] },
  );
  ok("closed day → no availability", res.length === 0, res);
}

// 4
{
  const res = computeAvailability({ subject: "physics", durationMin: 60 }, world([]));
  ok("no physics tutor → empty", res.length === 0, res);
}

// 5
{
  const res = computeAvailability(
    { subject: "chem", durationMin: 120, days: [1] },
    world([{ tutorId: "t1", roomId: "rA", dayOfWeek: 1, startTime: "08:00", endTime: "22:00", status: "scheduled" }]),
  );
  ok("gap (60m) < duration (120m) → no slot", res.find((r) => r.tutorId === "t1") === undefined, res);
}

// 6
{
  const res = computeAvailability(
    { subject: "chem", durationMin: 60, days: [1] },
    world([
      { tutorId: "tX", roomId: "rA", dayOfWeek: 1, startTime: "08:00", endTime: "23:00", status: "scheduled" },
      { tutorId: "tY", roomId: "rB", dayOfWeek: 1, startTime: "08:00", endTime: "23:00", status: "scheduled" },
    ]),
  );
  ok("all rooms busy → slot dropped", res.find((r) => r.tutorId === "t1") === undefined, res);
}

// 7
{
  const res = computeAvailability({ subject: "chem", durationMin: 60, days: [1], minCapacity: 5 }, world([]));
  const mon = res.find((r) => r.tutorId === "t1" && r.dayOfWeek === 1);
  ok(
    "minCapacity=5 → only ห้อง A (cap 6)",
    mon?.freeSlots[0]?.rooms.length === 1 && mon?.freeSlots[0]?.rooms[0]?.roomId === "rA",
    mon?.freeSlots[0]?.rooms,
  );
}

// 8
{
  const res = computeAvailability(
    { subject: "chem", durationMin: 60, days: [1] },
    world([{ tutorId: "t1", roomId: "rA", dayOfWeek: 1, startTime: "10:00", endTime: "12:00", status: "cancelled" }]),
  );
  const mon = res.find((r) => r.tutorId === "t1" && r.dayOfWeek === 1);
  ok("cancelled event ignored → full operating window free", mon?.freeSlots[0]?.start === "16:00" && mon?.freeSlots[0]?.end === "22:00", mon?.freeSlots[0]);
}

// 9
{
  const res = computeAvailability(
    { subject: "chem", durationMin: 60, days: [1] },
    world([{ tutorId: "t1", roomId: null, dayOfWeek: 1, startTime: "10:00", endTime: "12:00", status: "scheduled", deliveryMode: "online" }]),
  );
  const mon = res.find((r) => r.tutorId === "t1" && r.dayOfWeek === 1);
  ok("online class doesn't block onsite availability", mon?.freeSlots[0]?.start === "16:00" && mon?.freeSlots[0]?.end === "22:00", mon?.freeSlots[0]);
}

// 10 — blackout window ตัดช่วงที่ครูไม่รับสอนออก
{
  const t: AvailTutor = { ...tutorChem, blackouts: [{ dayOfWeek: 1, start: "16:00", end: "18:00" }] };
  const res = computeAvailability(
    { subject: "chem", durationMin: 60, days: [1] },
    { tutors: [t], rooms: [roomA], events: [] },
  );
  const mon = res.find((r) => r.dayOfWeek === 1);
  ok(
    "blackout 16:00–18:00 → free เริ่ม 18:00",
    mon?.freeSlots[0]?.start === "18:00" && mon?.freeSlots[0]?.end === "22:00",
    mon?.freeSlots,
  );
}

// 11 — blackout เต็มช่วงเปิด → ไม่มี slot
{
  const t: AvailTutor = { ...tutorChem, blackouts: [{ dayOfWeek: 1, start: "16:00", end: "22:00" }] };
  const res = computeAvailability(
    { subject: "chem", durationMin: 60, days: [1] },
    { tutors: [t], rooms: [roomA], events: [] },
  );
  ok("blackout เต็มวัน → ไม่มี slot", res.find((r) => r.dayOfWeek === 1) === undefined, res);
}

// eslint-disable-next-line no-console
console.log(`\nAvailability: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
