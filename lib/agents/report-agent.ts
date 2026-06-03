/**
 * ReportAgent — read-only narrative summaries over the existing snapshot.
 */

import { BaseAgent, buildSuccess } from "./base";
import { calculateTutorLoad } from "../conflict-checker";
import { toMinutes } from "../conflict-checker";
import type {
  AgentName,
  AgentRequest,
  AgentResponse,
  Deal,
  Room,
  ScheduleEvent,
  Tutor,
} from "./types";

export type ReportKind =
  | "weeklyScheduleSummary"
  | "roomUtilization"
  | "tutorWorkload"
  | "pendingDeals"
  | "conflicts"
  | "courseQuality";

export interface ReportAgentInput {
  kind: ReportKind;
  events: ScheduleEvent[];
  rooms?: Room[];
  tutors?: Tutor[];
  deals?: Deal[];
  /** Optional period — purely for the title; data is the snapshot as given. */
  periodLabel?: string;
}

export interface ReportSection {
  title: string;
  period: { label: string };
  metrics: { label: string; value: string }[];
  insights: string[];
  warnings: string[];
  recommendedActions: string[];
}

export type ReportAgentOutput = ReportSection;

export class ReportAgent extends BaseAgent<ReportAgentInput, ReportAgentOutput> {
  readonly name: AgentName = "report";
  readonly description = "สรุปข้อมูลตาราง/ห้อง/ครู/ดีลเป็นรายงานภาษาไทย (read-only)";

  async run(
    req: AgentRequest<ReportAgentInput>,
  ): Promise<AgentResponse<ReportAgentOutput>> {
    const started = Date.now();
    const input = req.payload;
    const period = { label: input.periodLabel ?? "สัปดาห์ปัจจุบัน" };

    switch (input.kind) {
      case "weeklyScheduleSummary": {
        const classes = input.events.filter((e) => e.status !== "cancelled").length;
        const hours = input.events.reduce(
          (s, e) =>
            e.status !== "cancelled"
              ? s + (toMinutes(e.endTime) - toMinutes(e.startTime)) / 60
              : s,
          0,
        );
        const pendingDeals = (input.deals ?? []).filter(
          (d) => d.status === "pending_schedule",
        ).length;
        return buildSuccess(this.name, {
          data: {
            title: "สรุปตารางสัปดาห์นี้",
            period,
            metrics: [
              { label: "จำนวนคลาส", value: `${classes}` },
              { label: "ชั่วโมงเรียนรวม", value: `${hours.toFixed(1)} ชม.` },
              { label: "ดีลรอจัดตาราง", value: `${pendingDeals}` },
            ],
            insights: [`สัปดาห์นี้มี ${classes} คลาส รวม ${hours.toFixed(1)} ชม.`],
            warnings: [],
            recommendedActions: pendingDeals
              ? [`มี ${pendingDeals} ดีลรอจัดตาราง — กรุณาตรวจ /admin/waiting-list`]
              : [],
          },
          message: "สรุปตารางพร้อม",
          startedAt: started,
        });
      }

      case "roomUtilization": {
        const rooms = input.rooms ?? [];
        const rows = rooms.map((room) => {
          const events = input.events.filter(
            (e) => e.roomId === room.id && e.status !== "cancelled",
          );
          const hours = events.reduce(
            (s, e) => s + (toMinutes(e.endTime) - toMinutes(e.startTime)) / 60,
            0,
          );
          return { roomId: room.id, roomName: room.name, hours, classes: events.length };
        });
        rows.sort((a, b) => b.hours - a.hours);
        const top = rows[0];
        const idle = rows.filter((r) => r.hours === 0);
        return buildSuccess(this.name, {
          data: {
            title: "การใช้งานห้องเรียน",
            period,
            metrics: rows.slice(0, 5).map((r) => ({
              label: r.roomName,
              value: `${r.hours.toFixed(1)} ชม. · ${r.classes} คลาส`,
            })),
            insights: [
              top ? `ห้องที่ใช้งานหนักสุดคือ ${top.roomName} ${top.hours.toFixed(1)} ชม.` : "ยังไม่มีคลาส",
              idle.length ? `${idle.length} ห้องยังว่างทั้งสัปดาห์` : "",
            ].filter(Boolean),
            warnings: [],
            recommendedActions: [],
          },
          message: "สรุปการใช้ห้องพร้อม",
          startedAt: started,
        });
      }

      case "tutorWorkload": {
        const tutors = input.tutors ?? [];
        const loads = tutors.map((t) => calculateTutorLoad(t.id, input.events, { tutor: t }));
        const overloaded = loads.filter((l) => l.exceedsWeeklyMax);
        const light = loads.filter((l) => l.hoursInWeek < 5);
        return buildSuccess(this.name, {
          data: {
            title: "ภาระงานติวเตอร์",
            period,
            metrics: loads.slice(0, 5).map((l, i) => ({
              label: tutors[i]?.name ?? l.tutorId,
              value: `${l.hoursInWeek.toFixed(1)} ชม. · ${l.classesInWeek} คลาส`,
            })),
            insights: [
              overloaded.length
                ? `มีครู ${overloaded.length} คนใกล้ถึง max hours per week`
                : "ไม่มีครูใกล้เกิน limit",
              light.length ? `${light.length} คน workload เบากว่า 5 ชม./สัปดาห์` : "",
            ].filter(Boolean),
            warnings: overloaded.map((l) => `${l.tutorId} เกิน weekly limit`),
            recommendedActions: overloaded.length
              ? ["พิจารณาเฉลี่ยคลาสไปยังครูคนอื่น"]
              : [],
          },
          message: "สรุป workload พร้อม",
          startedAt: started,
        });
      }

      case "pendingDeals": {
        const deals = input.deals ?? [];
        const pending = deals.filter((d) => d.status === "pending_schedule");
        const noCourse = pending.filter((d) => !d.courseId);
        return buildSuccess(this.name, {
          data: {
            title: "ดีลรอจัดตาราง",
            period,
            metrics: [
              { label: "รวม", value: `${pending.length}` },
              { label: "ขาด courseId", value: `${noCourse.length}` },
            ],
            insights: [`มีดีลรอจัดตาราง ${pending.length} รายการ`],
            warnings: noCourse.length
              ? [`${noCourse.length} ดีลยังไม่มี courseId`]
              : [],
            recommendedActions: pending.length
              ? ["รัน DealIntakeAgent ก่อนจัดตาราง"]
              : [],
          },
          message: "สรุปดีลพร้อม",
          startedAt: started,
        });
      }

      case "conflicts":
      case "courseQuality":
        // Phase-4+ work — emit the structure so UI can consume it now.
        return buildSuccess(this.name, {
          data: {
            title:
              input.kind === "conflicts"
                ? "Conflict report"
                : "Course quality (Phase-4)",
            period,
            metrics: [],
            insights: ["ยังไม่มีข้อมูล Phase-1"],
            warnings: [],
            recommendedActions: [],
          },
          message: "stub report",
          startedAt: started,
        });
    }
  }
}
