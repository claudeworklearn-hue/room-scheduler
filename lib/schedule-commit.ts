/**
 * commitScheduleWithValidation — the SINGLE entry point through which
 * any schedule-side mutation must flow.
 *
 *   AI Agent → Proposal[] → commitScheduleWithValidation() → Server Action
 *                              │                  │
 *                              │                  └─ runs Zod + EXCLUDE
 *                              └─ runs deterministic checkConflicts()
 *                                 + permission check + audit log
 *
 * Phase-1 status:
 *   - Permission gate                                       ✅ enforced
 *   - Deterministic conflict re-check                       ✅ enforced
 *   - Audit row write                                       ✅ via lib/audit
 *   - Actual DB INSERT/UPDATE                               ⏸ Phase-3 of
 *     the agent rollout (kept dry-run here so unit tests pass without DB)
 *
 * Agents NEVER call Supabase directly. They build a Proposal, hand it
 * here, and the result tells them whether it would be accepted.
 */

import type {
  AgentProposal,
  Conflict,
  Room,
  ScheduleCandidate,
  ScheduleEvent,
  Tutor,
  UserContext,
} from "./agents/types";
import { checkConflicts, toMinutes } from "./conflict-checker";
import { createAuditLog, type AuditAction } from "./audit";

// ============================================================================
// Public API
// ============================================================================

export interface CommitContext {
  existingEvents: ScheduleEvent[];
  rooms: Room[];
  tutors: Tutor[];
}

export interface CommitOptions {
  context: CommitContext;
  user: UserContext;
  /** Phase-1 default: false (dry-run). Server Actions will pass true. */
  apply?: boolean;
  /** When called by an agent, tag the audit log. */
  attributedAgent?: AgentProposal["agentName"] | null;
}

export type CommitResult =
  | {
      ok: true;
      applied: boolean;
      appliedAt: string;
      auditId: string | null;
      proposalKind: AgentProposal["kind"];
      message: string;
      notificationsQueued: boolean;
    }
  | {
      ok: false;
      reason:
        | "permission_denied"
        | "conflict"
        | "validation"
        | "unsupported"
        | "not_found";
      conflicts?: Conflict[];
      errors?: string[];
      proposalKind: AgentProposal["kind"];
      message: string;
    };

export async function commitScheduleWithValidation(
  proposal: AgentProposal,
  opts: CommitOptions,
): Promise<CommitResult> {
  // 1. Permission ----------------------------------------------------
  const permCheck = checkPermission(proposal, opts.user);
  if (!permCheck.ok) {
    return {
      ok: false,
      reason: "permission_denied",
      errors: permCheck.errors,
      proposalKind: proposal.kind,
      message: "ไม่มีสิทธิ์ดำเนินการนี้",
    };
  }

  // 2. Validation + conflict re-check --------------------------------
  const v = await validate(proposal, opts.context);
  if (!v.ok) {
    return {
      ok: false,
      reason: v.reason,
      conflicts: v.conflicts,
      errors: v.errors,
      proposalKind: proposal.kind,
      message:
        v.reason === "conflict"
          ? "ไม่สามารถบันทึกได้ เพราะมีตารางชน"
          : v.reason === "not_found"
            ? "ไม่พบ event ที่อ้างถึง"
            : "ข้อมูล proposal ไม่ครบ",
    };
  }

  // 3. Audit + (Phase-3 wire) write ---------------------------------
  const audit = await createAuditLog(
    proposalToAuditAction(proposal),
    null, // Phase-3: load row before
    proposal.payload,
    opts.user,
    {
      agentName: opts.attributedAgent ?? proposal.agentName,
      proposalKind: proposal.kind,
    },
  );

  if (!opts.apply) {
    return {
      ok: true,
      applied: false,
      appliedAt: new Date().toISOString(),
      auditId: audit.id,
      proposalKind: proposal.kind,
      message: "ผ่านการตรวจสอบ (dry-run)",
      notificationsQueued: false,
    };
  }

  throw new Error(
    `commitScheduleWithValidation: apply=true not wired yet for ${proposal.kind}. ` +
      "Subsequent phases will route this into app/admin/*/actions.ts.",
  );
}

// ============================================================================
// Phase-8 convenience wrappers
// ============================================================================

export async function updateScheduleWithValidation(
  input: { id: string; patch: Partial<ScheduleEvent> },
  user: UserContext,
  context: CommitContext,
): Promise<CommitResult> {
  return commitScheduleWithValidation(
    {
      kind: "event.update",
      payload: input,
      rationale: "manual update via updateScheduleWithValidation",
      confidence: 1,
      agentName: "orchestrator",
      createdAt: new Date().toISOString(),
    },
    { user, context, apply: false },
  );
}

export async function cancelScheduleWithValidation(
  input: { id: string },
  user: UserContext,
  context: CommitContext,
): Promise<CommitResult> {
  return commitScheduleWithValidation(
    {
      kind: "event.delete",
      payload: input,
      rationale: "manual cancel via cancelScheduleWithValidation",
      confidence: 1,
      agentName: "orchestrator",
      createdAt: new Date().toISOString(),
    },
    { user, context, apply: false },
  );
}

// ============================================================================
// Permissions
// ============================================================================

function checkPermission(
  proposal: AgentProposal,
  user: UserContext,
): { ok: true } | { ok: false; errors: string[] } {
  if (user.role === "system") return { ok: true };
  if (proposal.kind === "noop") return { ok: true };
  if (proposal.kind === "notify.send") return { ok: true };

  const isAdmin = user.role === "owner" || user.role === "manager";
  const pinAdmin = user.pinUnlocked;
  if (isAdmin || pinAdmin) return { ok: true };

  // tutors can only touch schedule events they own — and even then only
  // through self-service flows that arrive with role=tutor + matching id.
  // No such flow is wired yet, so all tutor writes are blocked.
  return {
    ok: false,
    errors: [
      `proposal ${proposal.kind} ต้องการสิทธิ์ owner/manager หรือเปิดโหมดแก้ไข (PIN)`,
    ],
  };
}

// ============================================================================
// Validation
// ============================================================================

type ValidateResult =
  | { ok: true }
  | {
      ok: false;
      reason: "validation" | "conflict" | "not_found" | "unsupported";
      conflicts?: Conflict[];
      errors?: string[];
    };

async function validate(
  proposal: AgentProposal,
  context: CommitContext,
): Promise<ValidateResult> {
  switch (proposal.kind) {
    case "noop":
    case "pending.delete":
    case "event.delete":
    case "pending.create":
    case "pending.update":
    case "notify.send":
    case "import.apply":
      return { ok: true };

    case "event.create":
    case "event.move":
    case "event.update": {
      const candidate = proposalToCandidate(proposal, context.existingEvents);
      if (!candidate) {
        return {
          ok: false,
          reason: "validation",
          errors: ["proposal payload missing required schedule fields"],
        };
      }
      if (proposal.kind !== "event.create" && !candidate.id) {
        return {
          ok: false,
          reason: "not_found",
          errors: ["referenced event id not present in context"],
        };
      }
      const room = candidate.roomId
        ? context.rooms.find((r) => r.id === candidate.roomId) ?? null
        : null;
      const tutor = candidate.tutorId
        ? context.tutors.find((t) => t.id === candidate.tutorId) ?? null
        : null;
      const result = checkConflicts({
        candidate,
        existingEvents: context.existingEvents,
        room,
        tutor,
      });
      if (!result.isValid) {
        return { ok: false, reason: "conflict", conflicts: result.conflicts };
      }
      return { ok: true };
    }
  }
}

// ============================================================================
// Adapters
// ============================================================================

function proposalToAuditAction(proposal: AgentProposal): AuditAction {
  switch (proposal.kind) {
    case "event.create": return "schedule.create";
    case "event.update": return "schedule.update";
    case "event.move":   return "schedule.move";
    case "event.delete": return "schedule.delete";
    case "pending.create": return "pending.create";
    case "pending.update": return "pending.update";
    case "pending.delete": return "pending.delete";
    case "notify.send":  return "notify.draft";
    case "import.apply": return "import.apply";
    case "noop":         return "schedule.update"; // never logged
  }
}

function proposalToCandidate(
  proposal: AgentProposal,
  existingEvents: ScheduleEvent[],
): ScheduleCandidate | null {
  if (proposal.kind === "event.create") {
    const p = proposal.payload;
    if (!p.dayOfWeek || !p.startTime || !p.endTime) return null;
    return {
      dayOfWeek: p.dayOfWeek,
      startTime: p.startTime,
      endTime: p.endTime,
      roomId: p.roomId ?? null,
      tutorId: p.tutorId ?? null,
      studentCount: p.studentCount ?? null,
      deliveryMode: p.deliveryMode,
    };
  }
  if (proposal.kind === "event.move") {
    const p = proposal.payload;
    const existing = existingEvents.find((e) => e.id === p.id);
    if (!existing) return null;
    const durMin = toMinutes(existing.endTime) - toMinutes(existing.startTime);
    const startMin = toMinutes(p.startTime);
    return {
      id: existing.id,
      dayOfWeek: p.dayOfWeek,
      startTime: p.startTime,
      endTime: minutesToHHMMSS(startMin + durMin),
      roomId: p.roomId,
      tutorId: existing.tutorId,
      studentCount: existing.studentCount,
      deliveryMode: existing.deliveryMode,
    };
  }
  if (proposal.kind === "event.update") {
    const p = proposal.payload;
    const existing = existingEvents.find((e) => e.id === p.id);
    if (!existing) return null;
    const merged = { ...existing, ...p.patch };
    return {
      id: merged.id,
      dayOfWeek: merged.dayOfWeek,
      startTime: merged.startTime,
      endTime: merged.endTime,
      roomId: merged.roomId,
      tutorId: merged.tutorId,
      studentCount: merged.studentCount,
      deliveryMode: merged.deliveryMode,
    };
  }
  return null;
}

function minutesToHHMMSS(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}
