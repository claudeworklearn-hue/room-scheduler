/**
 * ExceptionRecoveryAgent — when something breaks (tutor sick, room down,
 * customer reschedule, capacity blown), it surfaces feasible repair
 * options. NEVER commits — every option still has to be confirmed by an
 * admin and routed through commitScheduleWithValidation.
 */

import { BaseAgent, buildSuccess } from "./base";
import { checkConflicts } from "../conflict-checker";
import type {
  AgentName,
  AgentProposal,
  AgentRequest,
  AgentResponse,
  Conflict,
  DayOfWeek,
  Room,
  ScheduleCandidate,
  ScheduleEvent,
  TimeString,
  Tutor,
} from "./types";

export type RecoveryProblem =
  | "tutor_absent"
  | "room_unavailable"
  | "customer_reschedule"
  | "capacity_increase"
  | "conflict_after_update";

export interface RecoveryAgentInput {
  problem: RecoveryProblem;
  scheduleEventId: string;
  context: {
    events: ScheduleEvent[];
    rooms: Room[];
    tutors: Tutor[];
  };
  newPreferences?: {
    dayOfWeek?: DayOfWeek;
    startTime?: TimeString;
    endTime?: TimeString;
    studentCount?: number;
  };
}

export type RecoveryOptionType =
  | "change_tutor"
  | "change_room"
  | "change_time"
  | "split_class";

export interface RecoveryOption {
  type: RecoveryOptionType;
  newTutorId?: string;
  newRoomId?: string;
  dayOfWeek?: DayOfWeek;
  startTime?: TimeString;
  endTime?: TimeString;
  score: number;
  conflicts: Conflict[];
  message: string;
}

export interface RecoveryAgentOutput {
  success: boolean;
  problem: RecoveryProblem;
  affectedScheduleEvents: ScheduleEvent[];
  recoveryOptions: RecoveryOption[];
  recommendedAction: RecoveryOptionType | null;
}

export class ExceptionRecoveryAgent extends BaseAgent<
  RecoveryAgentInput,
  RecoveryAgentOutput
> {
  readonly name: AgentName = "exception_recovery";
  readonly description = "เสนอทางแก้เมื่อตารางพังเฉพาะหน้า";

  async run(
    req: AgentRequest<RecoveryAgentInput>,
  ): Promise<AgentResponse<RecoveryAgentOutput>> {
    const started = Date.now();
    const input = req.payload;
    const ev = input.context.events.find((e) => e.id === input.scheduleEventId);

    if (!ev) {
      return buildSuccess(this.name, {
        data: {
          success: false,
          problem: input.problem,
          affectedScheduleEvents: [],
          recoveryOptions: [],
          recommendedAction: null,
        },
        message: "ไม่พบ event ที่อ้างถึง",
        warnings: ["scheduleEventId not in context.events"],
        startedAt: started,
      });
    }

    const options: RecoveryOption[] = [];

    if (input.problem === "tutor_absent") {
      // try to change tutor first
      for (const tutor of input.context.tutors) {
        if (tutor.id === ev.tutorId) continue;
        if (tutor.status !== "active") continue;
        const candidate: ScheduleCandidate = {
          dayOfWeek: ev.dayOfWeek,
          startTime: ev.startTime,
          endTime: ev.endTime,
          roomId: ev.roomId,
          tutorId: tutor.id,
        };
        const cc = checkConflicts({
          candidate,
          existingEvents: input.context.events,
          tutor,
        });
        if (cc.isValid) {
          options.push({
            type: "change_tutor",
            newTutorId: tutor.id,
            score: 70 - cc.conflicts.filter((c) => c.severity === "warning").length * 10,
            conflicts: cc.conflicts,
            message: `เปลี่ยนเป็นครู ${tutor.name} ได้ โดยไม่ต้องเปลี่ยนเวลา/ห้อง`,
          });
        }
      }
    }

    if (input.problem === "room_unavailable") {
      for (const room of input.context.rooms) {
        if (room.id === ev.roomId) continue;
        if (room.status !== "active") continue;
        const candidate: ScheduleCandidate = {
          dayOfWeek: ev.dayOfWeek,
          startTime: ev.startTime,
          endTime: ev.endTime,
          roomId: room.id,
          tutorId: ev.tutorId,
          studentCount: ev.studentCount,
        };
        const cc = checkConflicts({
          candidate,
          existingEvents: input.context.events,
          room,
        });
        if (cc.isValid) {
          options.push({
            type: "change_room",
            newRoomId: room.id,
            score: 65,
            conflicts: cc.conflicts,
            message: `ย้ายเป็นห้อง ${room.name} ได้ ไม่ต้องเปลี่ยนเวลา/ครู`,
          });
        }
      }
    }

    if (input.problem === "customer_reschedule" && input.newPreferences?.dayOfWeek && input.newPreferences?.startTime) {
      const ns = input.newPreferences.startTime;
      const ne = input.newPreferences.endTime ?? ev.endTime;
      const candidate: ScheduleCandidate = {
        dayOfWeek: input.newPreferences.dayOfWeek,
        startTime: ns,
        endTime: ne,
        roomId: ev.roomId,
        tutorId: ev.tutorId,
      };
      const cc = checkConflicts({
        candidate,
        existingEvents: input.context.events,
        room: input.context.rooms.find((r) => r.id === ev.roomId) ?? null,
        tutor: input.context.tutors.find((t) => t.id === ev.tutorId) ?? null,
      });
      options.push({
        type: "change_time",
        dayOfWeek: input.newPreferences.dayOfWeek,
        startTime: ns,
        endTime: ne,
        score: cc.isValid ? 80 : 0,
        conflicts: cc.conflicts,
        message: cc.isValid
          ? `เลื่อนได้ตามที่ลูกค้าขอ`
          : `เลื่อนแล้วยังมีปัญหา: ${cc.conflicts[0]?.message ?? "ไม่ระบุ"}`,
      });
    }

    if (input.problem === "capacity_increase" && input.newPreferences?.studentCount) {
      const newCount = input.newPreferences.studentCount;
      const candidates = input.context.rooms
        .filter((r) => r.status === "active" && r.capacity >= newCount)
        .map((room) => ({
          room,
          cc: checkConflicts({
            candidate: {
              dayOfWeek: ev.dayOfWeek,
              startTime: ev.startTime,
              endTime: ev.endTime,
              roomId: room.id,
              tutorId: ev.tutorId,
              studentCount: newCount,
            },
            existingEvents: input.context.events,
            room,
          }),
        }))
        .filter((x) => x.cc.isValid);
      for (const x of candidates) {
        options.push({
          type: "change_room",
          newRoomId: x.room.id,
          score: 60,
          conflicts: x.cc.conflicts,
          message: `เลือกห้อง ${x.room.name} (จุ ${x.room.capacity})`,
        });
      }
      if (!candidates.length) {
        options.push({
          type: "split_class",
          score: 30,
          conflicts: [],
          message: "ไม่มีห้องใหญ่พอ — เสนอแตกเป็น 2 คลาส",
        });
      }
    }

    options.sort((a, b) => b.score - a.score);
    const recommended = options[0]?.type ?? null;

    const proposals: AgentProposal[] = options
      .filter((o) => o.score > 0 && o.conflicts.every((c) => c.severity !== "error"))
      .map((o) => ({
        kind: "event.update",
        payload: {
          id: ev.id,
          patch: pickPatch(o),
        },
        rationale: o.message,
        confidence: Math.min(1, o.score / 100),
        agentName: this.name,
        createdAt: new Date().toISOString(),
      }));

    return buildSuccess(this.name, {
      data: {
        success: true,
        problem: input.problem,
        affectedScheduleEvents: [ev],
        recoveryOptions: options.slice(0, 6),
        recommendedAction: recommended,
      },
      message: options.length
        ? `พบทางแก้ ${options.length} ทาง`
        : "ไม่พบทางแก้แบบ in-place — เสนอ split หรือเปลี่ยนวัน",
      proposals,
      startedAt: started,
    });
  }
}

function pickPatch(opt: RecoveryOption): Partial<ScheduleEvent> {
  const patch: Partial<ScheduleEvent> = {};
  if (opt.newTutorId) patch.tutorId = opt.newTutorId;
  if (opt.newRoomId) patch.roomId = opt.newRoomId;
  if (opt.dayOfWeek) patch.dayOfWeek = opt.dayOfWeek;
  if (opt.startTime) patch.startTime = opt.startTime;
  if (opt.endTime) patch.endTime = opt.endTime;
  return patch;
}
