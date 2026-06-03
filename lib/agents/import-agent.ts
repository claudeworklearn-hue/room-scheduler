/**
 * ImportSyncAgent — CSV/Google-Sheet ingest.
 *
 * Phase-1 implementation is for plain CSV/pasted-rows (Google Sheet
 * credentials wiring is Phase-5). Always supports dry-run.
 */

import { BaseAgent, buildSuccess } from "./base";
import { checkBulkScheduleEvents } from "../conflict-checker";
import type {
  AgentName,
  AgentRequest,
  AgentResponse,
  ImportPlanRow,
  Room,
  ScheduleCandidate,
  ScheduleEvent,
  Tutor,
  AgentProposal,
  DayOfWeek,
} from "./types";

export type ImportTarget = "rooms" | "tutors" | "courses" | "deals" | "schedule_events";
export type DuplicateStrategy = "skip" | "update" | "create_new" | "manual_review";

export interface ImportAgentInput {
  target: ImportTarget;
  /** Raw rows — already CSV-parsed. Each row is field→string. */
  rows: Record<string, string>[];
  /** When true: validate only, never produce apply proposals. */
  dryRun?: boolean;
  duplicateStrategy?: DuplicateStrategy;
  /** Context — needed only when target=schedule_events for conflict check. */
  existingEvents?: ScheduleEvent[];
  rooms?: Room[];
  tutors?: Tutor[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportAgentOutput {
  target: ImportTarget;
  mode: "dry_run" | "apply";
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: number;
  errors: ImportError[];
  readyToImport: boolean;
  /** Per-row decisions for an apply step. */
  plan: ImportPlanRow[];
}

export class ImportSyncAgent extends BaseAgent<ImportAgentInput, ImportAgentOutput> {
  readonly name: AgentName = "import_sync";
  readonly description = "นำเข้าข้อมูลจาก CSV/Sheet พร้อม dry-run + conflict check";

  async run(
    req: AgentRequest<ImportAgentInput>,
  ): Promise<AgentResponse<ImportAgentOutput>> {
    const started = Date.now();
    const input = req.payload;
    const dryRun = input.dryRun ?? true;

    const errors: ImportError[] = [];
    const plan: ImportPlanRow[] = [];

    input.rows.forEach((row, idx) => {
      const v = validateRow(input.target, row, idx);
      errors.push(...v.errors);
      if (!v.target) {
        plan.push({
          action: "skip",
          rowIndex: idx,
          target: {},
          reason: v.errors[0]?.message ?? "invalid row",
        });
        return;
      }
      plan.push({
        action: "create",
        rowIndex: idx,
        target: v.target,
        reason: "validated",
      });
    });

    // For schedule_events, also run a bulk conflict check.
    if (input.target === "schedule_events" && plan.length) {
      const candidates: ScheduleCandidate[] = plan
        .filter((p) => p.action !== "skip")
        .map((p) => ({
          dayOfWeek: p.target.dayOfWeek as DayOfWeek,
          startTime: p.target.startTime ?? "",
          endTime: p.target.endTime ?? "",
          roomId: p.target.roomId ?? null,
          tutorId: p.target.tutorId ?? null,
          studentCount: p.target.studentCount ?? null,
        }));
      try {
        const bulk = checkBulkScheduleEvents({
          candidates,
          existingEvents: input.existingEvents ?? [],
          rooms: input.rooms,
          tutors: input.tutors,
        });
        bulk.conflicts.forEach((c) =>
          errors.push({ row: -1, field: "schedule", message: c.message }),
        );
      } catch (err) {
        errors.push({
          row: -1,
          field: "schedule",
          message: `bulk check failed: ${(err as Error).message}`,
        });
      }
    }

    const validRows = plan.filter((p) => p.action !== "skip").length;
    const invalidRows = plan.length - validRows;
    const readyToImport = errors.length === 0 && validRows > 0;

    const proposals: AgentProposal[] =
      !dryRun && readyToImport
        ? [
            {
              kind: "import.apply",
              payload: { rows: plan },
              rationale: `import ${validRows} ${input.target}`,
              confidence: 0.9,
              agentName: this.name,
              createdAt: new Date().toISOString(),
            },
          ]
        : [];

    return buildSuccess(this.name, {
      data: {
        target: input.target,
        mode: dryRun ? "dry_run" : "apply",
        totalRows: input.rows.length,
        validRows,
        invalidRows,
        duplicates: 0, // phase-5 — needs a real lookup
        errors,
        readyToImport,
        plan,
      },
      message: readyToImport
        ? `${validRows} แถวพร้อมนำเข้า`
        : `พบ ${errors.length} ปัญหา`,
      warnings: errors.map((e) => `row ${e.row + 1}: ${e.field}: ${e.message}`),
      proposals,
      startedAt: started,
    });
  }
}

function validateRow(
  target: ImportTarget,
  row: Record<string, string>,
  idx: number,
): { target: Partial<ScheduleEvent> | null; errors: ImportError[] } {
  const errs: ImportError[] = [];
  if (target === "schedule_events") {
    const dayRaw = row.dayOfWeek ?? row.day_of_week;
    const start = row.startTime ?? row.start_time;
    const end = row.endTime ?? row.end_time;
    const title = row.title ?? row.title_th;
    const dow = Number(dayRaw);
    if (!Number.isInteger(dow) || dow < 1 || dow > 7) {
      errs.push({ row: idx, field: "dayOfWeek", message: "ต้องเป็น 1-7" });
    }
    if (!start) errs.push({ row: idx, field: "startTime", message: "ขาด startTime" });
    if (!end) errs.push({ row: idx, field: "endTime", message: "ขาด endTime" });
    if (!title) errs.push({ row: idx, field: "title", message: "ขาด title" });
    if (errs.length) return { target: null, errors: errs };
    return {
      target: {
        title,
        dayOfWeek: dow as DayOfWeek,
        startTime: start,
        endTime: end,
        roomId: row.roomId || null,
        tutorId: row.tutorId || null,
        studentCount: row.studentCount ? Number(row.studentCount) : null,
        source: "imported",
      },
      errors: [],
    };
  }
  // rooms / tutors / courses / deals — minimal validation in Phase-1
  if (!row.name && !row.title) {
    errs.push({ row: idx, field: "name", message: "ขาดชื่อ" });
  }
  return { target: errs.length ? null : ({} as Partial<ScheduleEvent>), errors: errs };
}
