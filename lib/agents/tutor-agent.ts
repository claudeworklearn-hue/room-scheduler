/**
 * TutorAgent — finds/explains/scores tutors. Read-only.
 */

import { BaseAgent, buildSuccess } from "./base";
import {
  checkConflicts,
  calculateTutorLoad,
  type TutorLoadSummary,
} from "../conflict-checker";
import type {
  AgentName,
  AgentRequest,
  AgentResponse,
  Conflict,
  DayOfWeek,
  ScheduleCandidate,
  ScheduleEvent,
  TimeString,
  Tutor,
} from "./types";

export type TutorAgentAction =
  | "list"
  | "availability"
  | "find_suitable"
  | "explain_choice"
  | "load_summary";

export interface TutorAgentInput {
  action: TutorAgentAction;
  tutors: Tutor[];
  events: ScheduleEvent[];
  dayOfWeek?: DayOfWeek;
  startTime?: TimeString;
  endTime?: TimeString;
  requiredSkills?: string[];
  preferredTutorId?: string;
  chosenTutorId?: string;
  filterSubject?: string;
}

export interface ScoredTutor {
  tutor: Tutor;
  available: boolean;
  reasons: string[];
  warnings: string[];
  conflicts: Conflict[];
  score: number;
  load: TutorLoadSummary | null;
}

export interface TutorAgentOutput {
  availableTutors: ScoredTutor[];
  unavailableTutors: { tutor: Tutor; reason: string }[];
  recommendedTutors: ScoredTutor[];
  loads: TutorLoadSummary[];
  explanation: string | null;
}

export class TutorAgent extends BaseAgent<TutorAgentInput, TutorAgentOutput> {
  readonly name: AgentName = "tutor";
  readonly description = "ค้นหา/แนะนำติวเตอร์ที่ skill ตรง ว่างจริง และยังไม่ overload";

  async run(
    req: AgentRequest<TutorAgentInput>,
  ): Promise<AgentResponse<TutorAgentOutput>> {
    const started = Date.now();
    const input = req.payload;

    if (input.action === "list") {
      const all = input.filterSubject
        ? input.tutors.filter((t) => t.skills.includes(input.filterSubject!))
        : input.tutors;
      return buildSuccess(this.name, {
        data: {
          availableTutors: all
            .filter((t) => t.status === "active")
            .map((tutor) => ({
              tutor,
              available: true,
              reasons: ["active"],
              warnings: [],
              conflicts: [],
              score: 50,
              load: null,
            })),
          unavailableTutors: all
            .filter((t) => t.status !== "active")
            .map((tutor) => ({ tutor, reason: tutor.status })),
          recommendedTutors: [],
          loads: [],
          explanation: null,
        },
        message: `${all.length} ติวเตอร์`,
        startedAt: started,
      });
    }

    if (input.action === "load_summary") {
      const loads = input.tutors.map((tutor) =>
        calculateTutorLoad(tutor.id, input.events, { tutor }),
      );
      return buildSuccess(this.name, {
        data: {
          availableTutors: [],
          unavailableTutors: [],
          recommendedTutors: [],
          loads,
          explanation: null,
        },
        message: `สรุป workload ${loads.length} คน`,
        warnings: loads
          .filter((l) => l.exceedsWeeklyMax)
          .map((l) => `${l.tutorId} เกิน max weekly`),
        startedAt: started,
      });
    }

    if (input.action === "explain_choice") {
      const tutor = input.tutors.find((t) => t.id === input.chosenTutorId);
      if (!tutor) {
        return buildSuccess(this.name, {
          data: {
            availableTutors: [],
            unavailableTutors: [],
            recommendedTutors: [],
            loads: [],
            explanation: "ไม่พบติวเตอร์ที่ระบุ",
          },
          message: "ไม่พบติวเตอร์",
          startedAt: started,
        });
      }
      const reasons = this.reasons(tutor, input);
      const explanation = `เลือก ${tutor.name} เพราะ ${reasons.join(" · ")}`;
      return buildSuccess(this.name, {
        data: {
          availableTutors: [],
          unavailableTutors: [],
          recommendedTutors: [],
          loads: [],
          explanation,
        },
        message: explanation,
        startedAt: started,
      });
    }

    if (!input.dayOfWeek || !input.startTime || !input.endTime) {
      return buildSuccess(this.name, {
        data: {
          availableTutors: [],
          unavailableTutors: [],
          recommendedTutors: [],
          loads: [],
          explanation: null,
        },
        message: "ต้องระบุ dayOfWeek + startTime + endTime",
        warnings: ["incomplete input"],
        startedAt: started,
      });
    }

    const scored: ScoredTutor[] = [];
    const unavailable: { tutor: Tutor; reason: string }[] = [];
    for (const tutor of input.tutors) {
      if (tutor.status !== "active") {
        unavailable.push({ tutor, reason: `status=${tutor.status}` });
        continue;
      }
      const candidate: ScheduleCandidate = {
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        roomId: null,
        tutorId: tutor.id,
      };
      const result = checkConflicts({
        candidate,
        existingEvents: input.events,
        tutor,
        requiredSubjects: input.requiredSkills,
      });
      const blocking = result.conflicts.some((c) => c.severity === "error");
      const load = calculateTutorLoad(tutor.id, input.events, {
        tutor,
        dayOfWeek: input.dayOfWeek,
      });
      if (blocking) {
        unavailable.push({
          tutor,
          reason:
            result.conflicts.find((c) => c.severity === "error")?.message ?? "ติวเตอร์ไม่ว่าง",
        });
        continue;
      }
      scored.push({
        tutor,
        available: true,
        reasons: this.reasons(tutor, input),
        warnings: result.conflicts
          .filter((c) => c.severity === "warning")
          .map((c) => c.message),
        conflicts: result.conflicts,
        score: this.score(tutor, input, result.conflicts, load),
        load,
      });
    }
    scored.sort((a, b) => b.score - a.score);
    const recommended = scored.slice(0, 5);
    return buildSuccess(this.name, {
      data: {
        availableTutors: scored,
        unavailableTutors: unavailable,
        recommendedTutors: recommended,
        loads: scored.map((s) => s.load!).filter(Boolean),
        explanation: recommended[0]
          ? `แนะนำ ${recommended[0].tutor.name}: ${recommended[0].reasons.join(" · ")}`
          : null,
      },
      message: `ว่าง ${scored.length} ติวเตอร์ · ใช้ไม่ได้ ${unavailable.length}`,
      startedAt: started,
    });
  }

  private reasons(tutor: Tutor, input: TutorAgentInput): string[] {
    const out: string[] = [`${tutor.name} (${tutor.shortCode})`];
    if (input.requiredSkills?.length) {
      const matches = input.requiredSkills.filter((s) =>
        tutor.skills.includes(s),
      );
      if (matches.length === input.requiredSkills.length) {
        out.push("skill ตรงทั้งหมด");
      } else if (matches.length) {
        out.push(`skill ตรง ${matches.length}/${input.requiredSkills.length}`);
      }
    }
    if (input.preferredTutorId === tutor.id) out.push("ตรง preferred");
    return out;
  }

  private score(
    tutor: Tutor,
    input: TutorAgentInput,
    conflicts: Conflict[],
    load: TutorLoadSummary,
  ): number {
    if (conflicts.some((c) => c.severity === "error")) return 0;
    let s = 30;
    if (input.requiredSkills?.length) {
      const matches = input.requiredSkills.filter((sk) =>
        tutor.skills.includes(sk),
      );
      if (matches.length === input.requiredSkills.length) s += 25;
      else if (matches.length) s += 10;
    }
    if (!load.exceedsWeeklyMax && !load.exceedsDailyMax) s += 20;
    if (load.weeklyRemaining > 4) s += 10;
    if (input.preferredTutorId === tutor.id) s += 15;
    if (!conflicts.some((c) => c.severity === "warning")) s += 10;
    return Math.min(100, s);
  }
}
