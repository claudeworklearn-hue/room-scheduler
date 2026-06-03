/**
 * Audit log helper — append-only record of who did what to schedule data.
 *
 * Phase-1 storage: console.info (no DB). Migration 0014 (planned) will
 * land an `agent_runs + audit_log` pair of tables; this helper will then
 * route to Supabase. Keeping a single `logAudit()` entry point now means
 * we can swap the backing store without touching call sites.
 */

import type {
  AgentName,
  AgentProposal,
  UserContext,
} from "./agents/types";

export type AuditAction =
  | "schedule.create"
  | "schedule.update"
  | "schedule.delete"
  | "schedule.move"
  | "pending.create"
  | "pending.update"
  | "pending.delete"
  | "notify.draft"
  | "import.apply";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  before: unknown | null;
  after: unknown | null;
  user: UserContext;
  agentName: AgentName | null;
  proposalKind: AgentProposal["kind"] | null;
  createdAt: string;
}

function rid(): string {
  // Date.now() is fine here — audit ids are human-debuggable, not security.
  return `aud_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export async function createAuditLog(
  action: AuditAction,
  before: unknown | null,
  after: unknown | null,
  user: UserContext,
  meta: { agentName?: AgentName | null; proposalKind?: AgentProposal["kind"] | null } = {},
): Promise<AuditEntry> {
  const entry: AuditEntry = {
    id: rid(),
    action,
    before,
    after,
    user,
    agentName: meta.agentName ?? null,
    proposalKind: meta.proposalKind ?? null,
    createdAt: new Date().toISOString(),
  };
  // Phase-1: emit so server logs capture the trail.
  // Phase-6 will route this to Supabase audit_log via service role.
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.info("[audit]", JSON.stringify(entry));
  }
  return entry;
}
