/**
 * Smoke tests for Deal Intake + Schedule Planner + Orchestrator routing.
 * Run: npx tsx tests/agents.test.ts
 */

import { DealIntakeAgent, prioritizeDeals } from "../lib/agents/intake-agent";
import { SchedulePlannerAgent, generateTimeCandidates } from "../lib/agents/planner-agent";
import { RoomAgent } from "../lib/agents/room-agent";
import { TutorAgent } from "../lib/agents/tutor-agent";
import { MainOrchestratorAgent, classifyIntent } from "../lib/agents/orchestrator";
import { mockRooms, mockTutors, mockEvents, mockDeals } from "../lib/agents/seed/mock-data";
import type {
  AgentRequest,
  UserContext,
  Deal,
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

const userCtx: UserContext = {
  userId: "u1",
  role: "owner",
  branchId: null,
  pinUnlocked: true,
};

function req<T>(payload: T): AgentRequest<T> {
  return {
    agentName: "orchestrator",
    intent: "smoke",
    payload,
    userContext: userCtx,
    timestamp: new Date().toISOString(),
  };
}

(async () => {
  // ── Deal Intake — Thai parser
  console.log("\nDeal Intake");
  const intake = new DealIntakeAgent();
  const r1 = await intake.run(
    req({
      deal: { id: "D-test", customerName: "ลูกค้าทดสอบ", studentCount: 3, durationMinutes: 90 } as Partial<Deal> & { id: string },
      freeText: "เสาร์เช้า ครูสอนคณิตได้",
    }),
  );
  ok(
    "parses 'เสาร์เช้า' into Sat (6) + morning",
    r1.success &&
      r1.data!.normalizedDeal.preferredDays.includes(6) &&
      r1.data!.normalizedDeal.preferredTimeRanges[0]?.start === "09:00",
  );
  ok("warns about morning being a guess", r1.warnings.some((w) => w.includes("เช้า")));

  const r2 = await intake.run(
    req({
      deal: { id: "D-test2", customerName: "x" } as Partial<Deal> & { id: string },
    }),
  );
  ok("flags missing fields", r2.data!.missingFields.length > 0 && !r2.data!.ready);

  ok(
    "prioritizeDeals sorts urgent first",
    prioritizeDeals([
      { ...mockDeals[0], priority: "low" },
      { ...mockDeals[0], id: "x", priority: "urgent" },
    ])[0].priority === "urgent",
  );

  // ── Time candidate generation
  console.log("\nPlanner — time candidates");
  const cands = generateTimeCandidates({
    dealId: "x",
    courseId: null,
    studentCount: 5,
    durationMinutes: 60,
    preferredDays: [6, 7],
    preferredTimeRanges: [{ start: "09:00", end: "12:00" }],
    startDate: null,
    endDate: null,
    requiredTutorSkills: [],
    requiredEquipment: [],
    preferredTutorId: null,
    preferredRoomId: null,
    priority: "normal",
  });
  ok("generates candidates from preferred ranges", cands.length > 0);
  ok(
    "all candidates honour preferredDays",
    cands.every((c) => c.dayOfWeek === 6 || c.dayOfWeek === 7),
  );

  // ── Planner end-to-end
  console.log("\nPlanner end-to-end");
  const planner = new SchedulePlannerAgent();
  const plannerRes = await planner.run(
    req({
      request: {
        dealId: "D001",
        courseId: null,
        studentCount: 5,
        durationMinutes: 60,
        preferredDays: [6],
        preferredTimeRanges: [{ start: "09:00", end: "12:00" }],
        startDate: null,
        endDate: null,
        requiredTutorSkills: ["math"],
        requiredEquipment: [],
        preferredTutorId: null,
        preferredRoomId: null,
        priority: "normal",
      },
      context: {
        existingEvents: mockEvents,
        rooms: mockRooms,
        tutors: mockTutors,
      },
      topN: 3,
    }),
  );
  ok("planner returns recommendations", plannerRes.data!.recommendations.length > 0);
  ok(
    "all recommendations are valid (no error conflicts)",
    plannerRes.data!.recommendations.every((r) => r.isValid),
  );
  ok(
    "each rec carries a proposal of kind event.create",
    plannerRes.proposals.length === plannerRes.data!.recommendations.length &&
      plannerRes.proposals.every((p) => p.kind === "event.create"),
  );

  // ── Room agent
  console.log("\nRoomAgent");
  const room = new RoomAgent();
  const roomRes = await room.run(
    req({
      action: "find_suitable",
      rooms: mockRooms,
      events: mockEvents,
      dayOfWeek: 6,
      startTime: "10:00",
      endTime: "11:30",
      studentCount: 10,
    }),
  );
  ok("room agent returns >0 candidates", roomRes.data!.availableRooms.length > 0);
  ok(
    "room R10 (maintenance) is excluded",
    !roomRes.data!.availableRooms.find((r) => r.room.id === "R10"),
  );

  // ── Tutor agent
  console.log("\nTutorAgent");
  const tutor = new TutorAgent();
  const tRes = await tutor.run(
    req({
      action: "find_suitable",
      tutors: mockTutors,
      events: mockEvents,
      dayOfWeek: 6,
      startTime: "10:00",
      endTime: "11:30",
      requiredSkills: ["math"],
    }),
  );
  ok("returns at least one math tutor", tRes.data!.availableTutors.length > 0);
  ok(
    "T08 inactive is excluded",
    !tRes.data!.availableTutors.find((t) => t.tutor.id === "T08"),
  );

  // ── Orchestrator routing
  console.log("\nOrchestrator");
  ok("intent: 'ตรวจตารางชน' → check_conflict", classifyIntent("ตรวจตารางชนไหม") === "check_conflict");
  ok("intent: 'หาห้องว่าง' → find_room", classifyIntent("หาห้องว่าง") === "find_room");
  ok("intent: 'จัดดีลให้หน่อย' → plan_schedule", classifyIntent("จัดดีลให้หน่อย") === "plan_schedule");
  ok("intent: 'ครูคนไหนสอน' → find_tutor", classifyIntent("ครูคนไหนสอนได้") === "find_tutor");

  // Smoke routing via orchestrator (it will call sub-agent through registry).
  const orch = new MainOrchestratorAgent();
  const orchRes = await orch.run(
    req({ userMessage: "ตรวจตารางชนไหม", subAgentPayload: { mode: "single", candidate: { dayOfWeek: 6, startTime: "10:00", endTime: "11:00", roomId: null, tutorId: null }, existingEvents: [] } }),
  );
  ok("orchestrator routes to conflict_checker", orchRes.data!.routedTo === "conflict_checker");

  // ── summary
  console.log(`\n${passed} passed · ${failed} failed`);
  if (failed > 0) process.exit(1);
})().catch((err) => {
  console.error("test runner crashed", err);
  process.exit(2);
});
