/**
 * ConflictCheckerAgent — thin LLM-free wrapper over lib/conflict-checker.
 *
 * The deterministic logic lives in lib/conflict-checker.ts and is the
 * source of truth. This agent exists so the orchestrator can route
 * "ตรวจตารางชนไหม" intents through the same agent contract as everyone
 * else; it does NOT add any guessing on top.
 */

import { BaseAgent, buildSuccess } from "./base";
import type {
  AgentName,
  AgentRequest,
  AgentResponse,
  ScheduleCandidate,
  ScheduleEvent,
  Room,
  Tutor,
} from "./types";
import {
  checkSingleScheduleEvent,
  checkBulkScheduleEvents,
  type BulkConflictCheckResult,
} from "../conflict-checker";

export type ConflictCheckerInput =
  | {
      mode: "single";
      candidate: ScheduleCandidate;
      existingEvents: ScheduleEvent[];
      room?: Room | null;
      tutor?: Tutor | null;
      requiredSubjects?: string[];
      requiredEquipment?: string[];
      bufferMinutes?: number;
    }
  | {
      mode: "bulk";
      candidates: ScheduleCandidate[];
      existingEvents: ScheduleEvent[];
      rooms?: Room[];
      tutors?: Tutor[];
      bufferMinutes?: number;
    };

export type ConflictCheckerOutput =
  | { mode: "single"; conflicts: ReturnType<typeof checkSingleScheduleEvent>; valid: boolean }
  | { mode: "bulk"; result: BulkConflictCheckResult };

export class ConflictCheckerAgent extends BaseAgent<
  ConflictCheckerInput,
  ConflictCheckerOutput
> {
  readonly name: AgentName = "conflict_checker";
  readonly description = "deterministic schedule conflict check (no LLM)";

  async run(
    req: AgentRequest<ConflictCheckerInput>,
  ): Promise<AgentResponse<ConflictCheckerOutput>> {
    const started = Date.now();
    const input = req.payload;
    if (input.mode === "single") {
      const conflicts = checkSingleScheduleEvent(input.candidate, {
        existingEvents: input.existingEvents,
        room: input.room ?? null,
        tutor: input.tutor ?? null,
        requiredSubjects: input.requiredSubjects,
        requiredEquipment: input.requiredEquipment,
        bufferMinutes: input.bufferMinutes,
      });
      const valid = !conflicts.some((c) => c.severity === "error");
      return buildSuccess(this.name, {
        data: { mode: "single", conflicts, valid },
        message: valid ? "ตรวจผ่าน" : `พบ ${conflicts.length} ปัญหา`,
        warnings: conflicts.filter((c) => c.severity === "warning").map((c) => c.message),
        startedAt: started,
      });
    }
    const result = checkBulkScheduleEvents({
      candidates: input.candidates,
      existingEvents: input.existingEvents,
      rooms: input.rooms,
      tutors: input.tutors,
      bufferMinutes: input.bufferMinutes,
    });
    return buildSuccess(this.name, {
      data: { mode: "bulk", result },
      message: result.summary,
      warnings: result.warnings.map((w) => w.message),
      startedAt: started,
    });
  }
}
