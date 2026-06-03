/**
 * Agent registry — single source for "who handles AgentName X".
 *
 * Lazily-initialised to avoid the orchestrator/registry import cycle that
 * would otherwise hit us at module-load time.
 */

import type { AgentName } from "./types";
import type { Agent } from "./base";

let _registry: Partial<Record<AgentName, Agent>> | null = null;

function buildRegistry(): Record<AgentName, Agent> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { MainOrchestratorAgent } = require("./orchestrator") as typeof import("./orchestrator");
  const { DealIntakeAgent } = require("./intake-agent") as typeof import("./intake-agent");
  const { SchedulePlannerAgent } = require("./planner-agent") as typeof import("./planner-agent");
  const { ConflictCheckerAgent } = require("./conflict-agent") as typeof import("./conflict-agent");
  const { RoomAgent } = require("./room-agent") as typeof import("./room-agent");
  const { TutorAgent } = require("./tutor-agent") as typeof import("./tutor-agent");
  const { NotificationAgent } = require("./notification-agent") as typeof import("./notification-agent");
  const { ReportAgent } = require("./report-agent") as typeof import("./report-agent");
  const { ImportSyncAgent } = require("./import-agent") as typeof import("./import-agent");
  const { ExceptionRecoveryAgent } = require("./recovery-agent") as typeof import("./recovery-agent");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    orchestrator: new MainOrchestratorAgent(),
    deal_intake: new DealIntakeAgent(),
    schedule_planner: new SchedulePlannerAgent(),
    conflict_checker: new ConflictCheckerAgent(),
    room: new RoomAgent(),
    tutor: new TutorAgent(),
    notification: new NotificationAgent(),
    report: new ReportAgent(),
    import_sync: new ImportSyncAgent(),
    exception_recovery: new ExceptionRecoveryAgent(),
  };
}

export function getAgent(name: AgentName): Agent {
  if (!_registry) _registry = buildRegistry();
  const a = _registry[name];
  if (!a) throw new Error(`Unknown agent: ${name}`);
  return a;
}

export function listAgents(): { name: AgentName; description: string }[] {
  if (!_registry) _registry = buildRegistry();
  return Object.values(_registry).map((a) => ({
    name: a!.name,
    description: a!.description,
  }));
}
