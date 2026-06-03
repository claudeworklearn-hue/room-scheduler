/**
 * DealIntakeAgent — turns a partially-filled or free-text deal into a
 * SchedulePlanningRequest that the Planner can use.
 *
 * No LLM calls in Phase-1. The Thai-language parser is conservative and
 * tags every guess with a warning + confidence < 1.
 */

import { BaseAgent, buildSuccess } from "./base";
import type {
  AgentName,
  AgentRequest,
  AgentResponse,
  Deal,
  DayOfWeek,
  TimeRange,
  DealPriority,
  AgentProposal,
} from "./types";

export interface DealIntakeInput {
  /** Raw deal data, possibly partial. */
  deal: Partial<Deal> & { id: string };
  /** Free-text from the customer / sales note. Will be parsed for hints. */
  freeText?: string;
}

export interface SchedulePlanningRequest {
  dealId: string;
  courseId: string | null;
  studentCount: number;
  durationMinutes: number;
  preferredDays: DayOfWeek[];
  preferredTimeRanges: TimeRange[];
  startDate: string | null;
  endDate: string | null;
  requiredTutorSkills: string[];
  requiredEquipment: string[];
  preferredTutorId: string | null;
  preferredRoomId: string | null;
  priority: DealPriority;
}

export interface DealIntakeOutput {
  ready: boolean;
  normalizedDeal: Deal;
  scheduleRequest: SchedulePlanningRequest | null;
  missingFields: string[];
  clarifyingQuestions: string[];
  parserHints: { field: string; source: string; confidence: number }[];
}

// ----------------------------------------------------------------------------
// Thai phrase → time-range helpers
// ----------------------------------------------------------------------------

export interface ParsedTimePhrase {
  ranges: TimeRange[];
  confidence: number;
  warning: string | null;
}

const THAI_DAY_MAP: Record<string, DayOfWeek> = {
  จันทร์: 1, อังคาร: 2, พุธ: 3, พฤหัส: 4, พฤหัสบดี: 4,
  ศุกร์: 5, เสาร์: 6, อาทิตย์: 7,
};

export function normalizeThaiPreferredTime(text: string): ParsedTimePhrase {
  const t = text.toLowerCase();
  // explicit HH:MM-HH:MM
  const explicit = t.match(/(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/);
  if (explicit) {
    const fmt = (h: string, m: string) =>
      `${h.padStart(2, "0")}:${m}` as const;
    return {
      ranges: [
        {
          start: fmt(explicit[1], explicit[2]),
          end: fmt(explicit[3], explicit[4]),
        },
      ],
      confidence: 0.95,
      warning: null,
    };
  }
  if (t.includes("เช้า") && !t.includes("ค่ำ")) {
    return {
      ranges: [{ start: "09:00", end: "12:00" }],
      confidence: 0.5,
      warning: 'แปล "เช้า" เป็น 09:00–12:00 — กรุณายืนยันกับลูกค้า',
    };
  }
  if (t.includes("บ่าย")) {
    return {
      ranges: [{ start: "13:00", end: "16:00" }],
      confidence: 0.5,
      warning: 'แปล "บ่าย" เป็น 13:00–16:00 — กรุณายืนยัน',
    };
  }
  if (t.includes("เย็น") || t.includes("ค่ำ")) {
    return {
      ranges: [{ start: "16:00", end: "19:00" }],
      confidence: 0.45,
      warning: 'แปล "เย็น/ค่ำ" เป็น 16:00–19:00 — กรุณายืนยัน',
    };
  }
  if (t.includes("หลังเลิกเรียน")) {
    return {
      ranges: [{ start: "16:30", end: "19:00" }],
      confidence: 0.4,
      warning: 'แปล "หลังเลิกเรียน" เป็น 16:30–19:00 — กรุณายืนยัน',
    };
  }
  return {
    ranges: [],
    confidence: 0,
    warning: null,
  };
}

export function extractPreferredDays(text: string): DayOfWeek[] {
  const found = new Set<DayOfWeek>();
  const t = text.toLowerCase();
  for (const [thai, day] of Object.entries(THAI_DAY_MAP)) {
    if (t.includes(thai.toLowerCase())) found.add(day);
  }
  if (t.includes("วันธรรมดา") || t.includes("เสาร์อาทิตย์ไม่ได้")) {
    [1, 2, 3, 4, 5].forEach((d) => found.add(d as DayOfWeek));
  }
  if (t.includes("เสาร์อาทิตย์") || t.includes("สุดสัปดาห์")) {
    found.add(6); found.add(7);
  }
  return Array.from(found).sort();
}

export function buildClarifyingQuestions(missing: string[]): string[] {
  const map: Record<string, string> = {
    studentCount: "ลูกค้ามีนักเรียนกี่คนครับ?",
    durationMinutes: "เรียนครั้งละกี่นาทีครับ?",
    preferredDays: "ลูกค้าสะดวกวันไหนบ้างครับ? (จันทร์–อาทิตย์)",
    preferredTimeRanges: "ช่วงเวลาที่สะดวก ระบุเป็น HH:MM-HH:MM ได้ไหมครับ?",
    courseId: "เป็นคอร์สอะไรครับ?",
    requiredTutorSkills: "ครูต้องสอนวิชาอะไรได้บ้างครับ?",
    startDate: "เริ่มเรียนวันที่เท่าไหร่ครับ?",
  };
  return missing.map((m) => map[m] ?? `กรุณาระบุ ${m}`);
}

// ----------------------------------------------------------------------------
// Agent class
// ----------------------------------------------------------------------------

export class DealIntakeAgent extends BaseAgent<DealIntakeInput, DealIntakeOutput> {
  readonly name: AgentName = "deal_intake";
  readonly description = "normalize deal data + detect missing fields";

  async run(
    req: AgentRequest<DealIntakeInput>,
  ): Promise<AgentResponse<DealIntakeOutput>> {
    const started = Date.now();
    const { deal, freeText } = req.payload;

    const hints: { field: string; source: string; confidence: number }[] = [];
    const warnings: string[] = [];

    // Parse Thai free-text for hints (no overrides on existing values).
    let parsedDays: DayOfWeek[] = deal.preferredDays ?? [];
    let parsedRanges: TimeRange[] = deal.preferredTimeRanges ?? [];
    if (freeText) {
      if (!parsedDays.length) {
        const fromText = extractPreferredDays(freeText);
        if (fromText.length) {
          parsedDays = fromText;
          hints.push({ field: "preferredDays", source: "free_text", confidence: 0.8 });
        }
      }
      if (!parsedRanges.length) {
        const parsed = normalizeThaiPreferredTime(freeText);
        if (parsed.ranges.length) {
          parsedRanges = parsed.ranges;
          hints.push({
            field: "preferredTimeRanges",
            source: "free_text",
            confidence: parsed.confidence,
          });
          if (parsed.warning) warnings.push(parsed.warning);
        }
      }
    }

    const normalized: Deal = {
      id: deal.id,
      customerName: deal.customerName ?? "",
      courseId: deal.courseId ?? null,
      studentCount: deal.studentCount ?? 0,
      preferredDays: parsedDays,
      preferredTimeRanges: parsedRanges,
      startDate: deal.startDate ?? null,
      endDate: deal.endDate ?? null,
      durationMinutes: deal.durationMinutes ?? 0,
      requiredTutorSkills: deal.requiredTutorSkills ?? [],
      roomRequirement: deal.roomRequirement ?? null,
      priority: deal.priority ?? "normal",
      status: deal.status ?? "pending_schedule",
      notes: deal.notes ?? null,
    };

    const missing: string[] = [];
    if (!normalized.customerName) missing.push("customerName");
    if (!normalized.studentCount) missing.push("studentCount");
    if (!normalized.durationMinutes) missing.push("durationMinutes");
    if (!normalized.preferredDays.length) missing.push("preferredDays");
    if (!normalized.preferredTimeRanges.length) missing.push("preferredTimeRanges");

    const ready = missing.length === 0;
    const scheduleRequest: SchedulePlanningRequest | null = ready
      ? {
          dealId: normalized.id,
          courseId: normalized.courseId,
          studentCount: normalized.studentCount,
          durationMinutes: normalized.durationMinutes,
          preferredDays: normalized.preferredDays,
          preferredTimeRanges: normalized.preferredTimeRanges,
          startDate: normalized.startDate,
          endDate: normalized.endDate,
          requiredTutorSkills: normalized.requiredTutorSkills,
          requiredEquipment: normalized.roomRequirement?.requiredEquipment ?? [],
          preferredTutorId: null,
          preferredRoomId: null,
          priority: normalized.priority,
        }
      : null;

    const proposals: AgentProposal[] = ready
      ? [
          {
            kind: "pending.update",
            payload: { id: normalized.id, patch: normalized },
            rationale: "deal normalized + ready for planning",
            confidence: 0.85,
            agentName: this.name,
            createdAt: new Date().toISOString(),
          },
        ]
      : [];

    return buildSuccess(this.name, {
      data: {
        ready,
        normalizedDeal: normalized,
        scheduleRequest,
        missingFields: missing,
        clarifyingQuestions: buildClarifyingQuestions(missing),
        parserHints: hints,
      },
      message: ready
        ? "ดีลนี้พร้อมจัดตาราง"
        : `ดีลนี้ยังไม่พร้อม — ขาด ${missing.length} field`,
      warnings,
      proposals,
      startedAt: started,
    });
  }
}

/** Phase-6 helper — pure deal-list prioritization. */
export function prioritizeDeals(deals: Deal[]): Deal[] {
  const score = (d: Deal): number => {
    const pri = { urgent: 100, high: 70, normal: 40, low: 10 }[d.priority];
    const dateScore = d.startDate
      ? Math.max(0, 30 - daysUntil(d.startDate))
      : 0;
    return pri + dateScore;
  };
  return [...deals].sort((a, b) => score(b) - score(a));
}

function daysUntil(iso: string): number {
  const target = Date.parse(iso);
  if (Number.isNaN(target)) return 365;
  const days = Math.floor((target - Date.parse(new Date().toISOString())) / 86400_000);
  return Math.max(0, days);
}
