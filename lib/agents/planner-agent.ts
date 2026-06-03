/**
 * SchedulePlannerAgent — the heart of the AI flow.
 *
 *   SchedulePlanningRequest
 *      ↓
 *   1. generateTimeCandidates  (preferredDays × preferredTimeRanges × duration)
 *      ↓
 *   2. RoomAgent.find_suitable for each time
 *      ↓
 *   3. TutorAgent.find_suitable for each time
 *      ↓
 *   4. Cross-join room × tutor × time
 *      ↓
 *   5. checkConflicts on each combination (deterministic, blocking)
 *      ↓
 *   6. score, sort, return top-N + rejected explanations
 *
 * It NEVER commits. Top recommendations are returned as proposals of
 * kind "event.create" so the caller (orchestrator → UI) can hand them
 * to commitScheduleWithValidation only after a human confirms.
 */

import { BaseAgent, buildSuccess } from "./base";
import { checkConflicts, toMinutes } from "../conflict-checker";
import type {
  AgentName,
  AgentRequest,
  AgentResponse,
  Conflict,
  DayOfWeek,
  Room,
  ScheduleCandidate,
  ScheduleEvent,
  ScheduleRecommendation,
  TimeString,
  Tutor,
  AgentProposal,
} from "./types";
import type { SchedulePlanningRequest } from "./intake-agent";

export interface PlannerContext {
  existingEvents: ScheduleEvent[];
  rooms: Room[];
  tutors: Tutor[];
}

export interface PlannerInput {
  request: SchedulePlanningRequest;
  context: PlannerContext;
  topN?: number;
  slotStepMinutes?: number;
  /** when true, also evaluate slots outside preferred ranges (lower score) */
  exploreAlternatives?: boolean;
}

export interface RejectedOption {
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  roomId: string | null;
  tutorId: string | null;
  reason: string;
}

export interface PlannerOutput {
  recommendations: ScheduleRecommendation[];
  rejectedOptions: RejectedOption[];
  alternativesIfNone: string[];
}

const DEFAULT_SLOT_STEP = 30;

export class SchedulePlannerAgent extends BaseAgent<PlannerInput, PlannerOutput> {
  readonly name: AgentName = "schedule_planner";
  readonly description = "เสนอ slot ที่ผ่านการตรวจ Conflict Checker แล้ว";

  async run(
    req: AgentRequest<PlannerInput>,
  ): Promise<AgentResponse<PlannerOutput>> {
    const started = Date.now();
    const { request, context, topN = 5, slotStepMinutes } = req.payload;

    // 1. Time candidates
    const times = generateTimeCandidates(request, slotStepMinutes);
    if (!times.length) {
      return buildSuccess(this.name, {
        data: {
          recommendations: [],
          rejectedOptions: [],
          alternativesIfNone: suggestAlternativesWhenNoSlot(request, []),
        },
        message: "ไม่พบ time candidate จาก preferred constraints",
        warnings: ["preferredTimeRanges / preferredDays ว่างหรือไม่ครบ"],
        startedAt: started,
      });
    }

    // 2-5. Cross-join + conflict
    const valid: ScheduleRecommendation[] = [];
    const rejected: RejectedOption[] = [];
    const tutors = context.tutors.filter((t) => t.status === "active");
    const rooms = context.rooms.filter((r) => r.status === "active");

    for (const t of times) {
      for (const tutor of tutors) {
        // tutor skill quick gate
        const skillsOk = !request.requiredTutorSkills.length
          ? true
          : request.requiredTutorSkills.every((s) => tutor.skills.includes(s));
        for (const room of rooms.length ? rooms : [null]) {
          const candidate: ScheduleCandidate = {
            dayOfWeek: t.dayOfWeek,
            startTime: t.startTime,
            endTime: t.endTime,
            roomId: room?.id ?? null,
            tutorId: tutor.id,
            studentCount: request.studentCount,
          };
          const cc = checkConflicts({
            candidate,
            existingEvents: context.existingEvents,
            room: room ?? null,
            tutor,
            requiredSubjects: request.requiredTutorSkills,
            requiredEquipment: request.requiredEquipment,
          });

          if (!cc.isValid) {
            rejected.push({
              dayOfWeek: t.dayOfWeek,
              startTime: t.startTime,
              roomId: room?.id ?? null,
              tutorId: tutor.id,
              reason:
                cc.conflicts.find((c) => c.severity === "error")?.message ??
                "blocked",
            });
            continue;
          }

          const score = scoreScheduleOption(
            { request, candidate, room, tutor, skillsOk, conflicts: cc.conflicts },
          );

          valid.push({
            id: `rec_${t.dayOfWeek}_${t.startTime}_${room?.id ?? "online"}_${tutor.id}`,
            date: null,
            dayOfWeek: t.dayOfWeek,
            startTime: t.startTime,
            endTime: t.endTime,
            roomId: room?.id ?? null,
            tutorId: tutor.id,
            score,
            reasons: explainRecommendation({ request, candidate, room, tutor }),
            warnings: cc.conflicts
              .filter((c) => c.severity === "warning")
              .map((c) => c.message),
            conflicts: cc.conflicts,
            isValid: true,
          });
        }
      }
    }

    valid.sort((a, b) => b.score - a.score);
    const recommendations = valid.slice(0, topN);

    const alternatives =
      recommendations.length === 0
        ? suggestAlternativesWhenNoSlot(request, rejected)
        : [];

    const proposals: AgentProposal[] = recommendations.map((r) => ({
      kind: "event.create",
      payload: {
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        roomId: r.roomId,
        tutorId: r.tutorId,
        studentCount: request.studentCount,
        courseId: request.courseId,
        title: "(generated)",
        dealId: request.dealId,
        source: "ai_suggested",
      },
      rationale: `score=${r.score} · ${r.reasons.join(" · ")}`,
      confidence: r.score / 100,
      agentName: this.name,
      createdAt: new Date().toISOString(),
    }));

    return buildSuccess(this.name, {
      data: {
        recommendations,
        rejectedOptions: rejected.slice(0, 20),
        alternativesIfNone: alternatives,
      },
      message: recommendations.length
        ? `พบ ${recommendations.length} ตัวเลือกที่จัดได้`
        : "ไม่พบ slot ที่จัดได้ ตรวจ alternatives",
      proposals,
      startedAt: started,
    });
  }
}

// ----------------------------------------------------------------------------
// pure helpers — exported for tests
// ----------------------------------------------------------------------------

export function generateTimeCandidates(
  request: SchedulePlanningRequest,
  step = DEFAULT_SLOT_STEP,
): Array<{ dayOfWeek: DayOfWeek; startTime: TimeString; endTime: TimeString }> {
  const out: { dayOfWeek: DayOfWeek; startTime: TimeString; endTime: TimeString }[] =
    [];
  if (!request.preferredDays.length || !request.preferredTimeRanges.length) {
    return out;
  }
  const dur = request.durationMinutes;
  for (const day of request.preferredDays) {
    for (const range of request.preferredTimeRanges) {
      const rangeStart = toMinutes(range.start);
      const rangeEnd = toMinutes(range.end);
      for (let m = rangeStart; m + dur <= rangeEnd; m += step) {
        const s = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
        const e = `${pad(Math.floor((m + dur) / 60))}:${pad((m + dur) % 60)}`;
        out.push({ dayOfWeek: day, startTime: s, endTime: e });
      }
    }
  }
  return out;
}

interface ScoreInput {
  request: SchedulePlanningRequest;
  candidate: ScheduleCandidate;
  room: Room | null;
  tutor: Tutor;
  skillsOk?: boolean;
  conflicts: Conflict[];
}

export function scoreScheduleOption(input: ScoreInput): number {
  const { request, candidate, room, tutor, conflicts } = input;
  if (conflicts.some((c) => c.severity === "error")) return 0;

  let score = 0;
  // 25 — preferred day/time match
  if (request.preferredDays.includes(candidate.dayOfWeek)) score += 12;
  if (
    request.preferredTimeRanges.some(
      (r) =>
        toMinutes(candidate.startTime) >= toMinutes(r.start) &&
        toMinutes(candidate.endTime) <= toMinutes(r.end),
    )
  ) {
    score += 13;
  }
  // 20 — tutor skill match
  if (request.requiredTutorSkills.length === 0) score += 10;
  else if (request.requiredTutorSkills.every((s) => tutor.skills.includes(s)))
    score += 20;
  // 15 — tutor workload (proxy: hasn't busted limits)
  if (
    !conflicts.some(
      (c) => c.type === "tutor_unavailable" && c.severity === "warning",
    )
  ) {
    score += 15;
  }
  // 15 — room fit
  if (room && request.studentCount && room.capacity > 0) {
    const ratio = request.studentCount / room.capacity;
    if (ratio >= 0.5 && ratio <= 0.9) score += 15;
    else if (ratio > 0.3) score += 8;
  } else if (!room) {
    // online — neutral
    score += 8;
  }
  // 10 — no warnings
  if (!conflicts.some((c) => c.severity === "warning")) score += 10;
  // 5 — preferred tutor/room
  if (request.preferredTutorId === tutor.id) score += 3;
  if (request.preferredRoomId && room?.id === request.preferredRoomId) score += 2;
  // 5 — even room distribution (placeholder — Phase-6 will use utilization)
  score += 5;
  // 5 — priority urgency (start sooner)
  score += { urgent: 5, high: 4, normal: 3, low: 1 }[request.priority];
  return Math.min(100, score);
}

export function explainRecommendation(input: {
  request: SchedulePlanningRequest;
  candidate: ScheduleCandidate;
  room: Room | null;
  tutor: Tutor;
}): string[] {
  const reasons: string[] = [];
  reasons.push(
    `${["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์","อาทิตย์"][input.candidate.dayOfWeek - 1]} ${input.candidate.startTime}–${input.candidate.endTime}`,
  );
  if (input.request.preferredDays.includes(input.candidate.dayOfWeek)) {
    reasons.push("ตรงวันที่ลูกค้าสะดวก");
  }
  reasons.push(`ครู ${input.tutor.name}`);
  if (input.room) {
    reasons.push(`ห้อง ${input.room.name} จุ ${input.room.capacity}`);
  } else {
    reasons.push("ออนไลน์");
  }
  reasons.push("ไม่ชนตาราง");
  return reasons;
}

export function suggestAlternativesWhenNoSlot(
  request: SchedulePlanningRequest,
  rejected: RejectedOption[],
): string[] {
  const out: string[] = [];
  // What's blocking the most?
  const reasonCounts = new Map<string, number>();
  for (const r of rejected) {
    reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);
  }
  const topReason = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topReason?.includes("ห้อง")) out.push("ลองเปลี่ยนห้องที่ใหญ่ขึ้น หรือเปลี่ยนตึก");
  if (topReason?.includes("ครู")) out.push("ลองหาครูคนอื่นที่มี skill เดียวกัน");
  if (!request.preferredDays.includes(6) && !request.preferredDays.includes(7)) {
    out.push("เพิ่มวันเสาร์/อาทิตย์เป็นตัวเลือก");
  }
  if (request.durationMinutes >= 120) {
    out.push("ลองแตกเป็น 2 คลาสสั้นๆ");
  }
  if (out.length === 0) {
    out.push("ขยาย preferredTimeRanges ให้กว้างขึ้น");
  }
  return out;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
