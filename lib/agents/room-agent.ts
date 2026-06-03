/**
 * RoomAgent — finds/explains/scores rooms.
 * Read-only. Uses checkConflicts to verify availability; never writes.
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
  TimeString,
} from "./types";

export type RoomAgentAction =
  | "list"
  | "availability"
  | "find_suitable"
  | "explain_choice"
  | "utilization";

export interface RoomAgentInput {
  action: RoomAgentAction;
  rooms: Room[];
  events: ScheduleEvent[];
  dayOfWeek?: DayOfWeek;
  startTime?: TimeString;
  endTime?: TimeString;
  studentCount?: number;
  requiredEquipment?: string[];
  preferredRoomId?: string;
  preferredBuilding?: string | null;
  businessHours?: { start: TimeString; end: TimeString };
  /** for explain_choice */
  chosenRoomId?: string;
}

export interface ScoredRoom {
  room: Room;
  available: boolean;
  reasons: string[];
  warnings: string[];
  conflicts: Conflict[];
  score: number;
}

export interface RoomUtilizationEntry {
  roomId: string;
  roomName: string;
  hours: number;
  classes: number;
  utilizationPct: number;
}

export interface RoomAgentOutput {
  availableRooms: ScoredRoom[];
  unavailableRooms: { room: Room; reason: string }[];
  recommendedRooms: ScoredRoom[];
  explanation: string | null;
  utilization: RoomUtilizationEntry[];
}

const DAY_MINS_DEFAULT = 14 * 60; // 08:00–22:00

export class RoomAgent extends BaseAgent<RoomAgentInput, RoomAgentOutput> {
  readonly name: AgentName = "room";
  readonly description = "ค้นหา/แนะนำห้องที่เหมาะกับ slot และอธิบายเหตุผล";

  async run(
    req: AgentRequest<RoomAgentInput>,
  ): Promise<AgentResponse<RoomAgentOutput>> {
    const started = Date.now();
    const input = req.payload;

    if (input.action === "list") {
      const active = input.rooms.filter((r) => r.status === "active");
      const inactive = input.rooms
        .filter((r) => r.status !== "active")
        .map((room) => ({ room, reason: room.status }));
      return buildSuccess(this.name, {
        data: {
          availableRooms: active.map((room) => ({
            room,
            available: true,
            reasons: ["status=active"],
            warnings: [],
            conflicts: [],
            score: 50,
          })),
          unavailableRooms: inactive,
          recommendedRooms: [],
          explanation: null,
          utilization: [],
        },
        message: `${active.length} active room(s) · ${inactive.length} unavailable`,
        startedAt: started,
      });
    }

    if (input.action === "utilization") {
      const businessHoursMin = input.businessHours
        ? toMinutes(input.businessHours.end) - toMinutes(input.businessHours.start)
        : DAY_MINS_DEFAULT;
      const weeklyCap = businessHoursMin * 7;
      const utilization: RoomUtilizationEntry[] = input.rooms.map((room) => {
        const events = input.events.filter(
          (e) => e.roomId === room.id && e.status !== "cancelled",
        );
        const minutes = events.reduce(
          (s, e) => s + (toMinutes(e.endTime) - toMinutes(e.startTime)),
          0,
        );
        return {
          roomId: room.id,
          roomName: room.name,
          hours: +(minutes / 60).toFixed(1),
          classes: events.length,
          utilizationPct: weeklyCap > 0 ? +((minutes / weeklyCap) * 100).toFixed(1) : 0,
        };
      });
      utilization.sort((a, b) => b.utilizationPct - a.utilizationPct);
      return buildSuccess(this.name, {
        data: {
          availableRooms: [],
          unavailableRooms: [],
          recommendedRooms: [],
          explanation: null,
          utilization,
        },
        message: `สรุปการใช้ห้อง ${utilization.length} ห้อง`,
        startedAt: started,
      });
    }

    if (input.action === "explain_choice") {
      const room = input.rooms.find((r) => r.id === input.chosenRoomId);
      if (!room) {
        return buildSuccess(this.name, {
          data: {
            availableRooms: [],
            unavailableRooms: [],
            recommendedRooms: [],
            explanation: "ไม่พบห้องที่ระบุ",
            utilization: [],
          },
          message: "ไม่พบห้อง",
          startedAt: started,
        });
      }
      const reasons = this.reasons(room, input);
      const explanation = `เลือกห้อง ${room.name} เพราะ ${reasons.join(" · ")}`;
      return buildSuccess(this.name, {
        data: {
          availableRooms: [],
          unavailableRooms: [],
          recommendedRooms: [],
          explanation,
          utilization: [],
        },
        message: explanation,
        startedAt: started,
      });
    }

    // availability / find_suitable share the same core
    if (!input.dayOfWeek || !input.startTime || !input.endTime) {
      return buildSuccess(this.name, {
        data: {
          availableRooms: [],
          unavailableRooms: [],
          recommendedRooms: [],
          explanation: null,
          utilization: [],
        },
        message: "ต้องระบุ dayOfWeek + startTime + endTime",
        warnings: ["incomplete input"],
        startedAt: started,
      });
    }

    const scored: ScoredRoom[] = [];
    const unavailable: { room: Room; reason: string }[] = [];
    for (const room of input.rooms) {
      if (room.status !== "active") {
        unavailable.push({ room, reason: `room status=${room.status}` });
        continue;
      }
      const candidate: ScheduleCandidate = {
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        roomId: room.id,
        tutorId: null,
        studentCount: input.studentCount,
      };
      const result = checkConflicts({
        candidate,
        existingEvents: input.events,
        room,
        requiredEquipment: input.requiredEquipment,
        businessHours: input.businessHours,
      });
      if (!result.isValid) {
        unavailable.push({
          room,
          reason: result.conflicts.find((c) => c.severity === "error")?.message ?? "ไม่ว่าง",
        });
        continue;
      }
      scored.push({
        room,
        available: true,
        reasons: this.reasons(room, input),
        warnings: result.conflicts
          .filter((c) => c.severity === "warning")
          .map((c) => c.message),
        conflicts: result.conflicts,
        score: this.score(room, input, result.conflicts),
      });
    }
    scored.sort((a, b) => b.score - a.score);
    const recommended = scored.slice(0, 5);
    return buildSuccess(this.name, {
      data: {
        availableRooms: scored,
        unavailableRooms: unavailable,
        recommendedRooms: recommended,
        explanation: recommended[0]
          ? `แนะนำ ${recommended[0].room.name}: ${recommended[0].reasons.join(" · ")}`
          : null,
        utilization: [],
      },
      message: `ว่าง ${scored.length} ห้อง · ใช้ไม่ได้ ${unavailable.length}`,
      startedAt: started,
    });
  }

  private reasons(room: Room, input: RoomAgentInput): string[] {
    const out: string[] = [`จุได้ ${room.capacity}`];
    if (input.studentCount != null && room.capacity >= input.studentCount) {
      out.push("ความจุพอ");
    }
    if (
      input.requiredEquipment?.length &&
      input.requiredEquipment.every((e) => room.equipment.includes(e))
    ) {
      out.push("อุปกรณ์ครบ");
    }
    if (input.preferredRoomId === room.id) out.push("ตรง preferred");
    if (input.preferredBuilding && room.building === input.preferredBuilding) {
      out.push(`ตึก ${room.building}`);
    }
    return out;
  }

  private score(
    room: Room,
    input: RoomAgentInput,
    conflicts: Conflict[],
  ): number {
    if (conflicts.some((c) => c.severity === "error")) return 0;
    let s = 40;
    if (input.studentCount != null && room.capacity > 0) {
      const ratio = input.studentCount / room.capacity;
      if (ratio >= 0.5 && ratio <= 0.9) s += 15;
      else if (ratio > 0.9) s += 8;
      else if (ratio > 0.3) s += 5;
    }
    if (
      input.requiredEquipment?.length &&
      input.requiredEquipment.every((e) => room.equipment.includes(e))
    ) {
      s += 20;
    }
    if (input.preferredRoomId === room.id) s += 15;
    if (input.preferredBuilding && room.building === input.preferredBuilding) {
      s += 5;
    }
    if (!conflicts.some((c) => c.severity === "warning")) s += 10;
    return Math.min(100, s);
  }
}
