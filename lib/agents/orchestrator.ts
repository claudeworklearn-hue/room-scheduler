/**
 * MainOrchestratorAgent
 *
 * Classifies the user's intent (simple keyword router in Phase-1) and
 * routes to the appropriate sub-agent. NEVER commits — it just chains
 * responses and surfaces Proposals + NextActions for the UI.
 */

import { BaseAgent, buildSuccess, safeRun } from "./base";
import { getAgent } from "./registry";
import type {
  AgentName,
  AgentProposal,
  AgentRequest,
  AgentResponse,
  NextAction,
} from "./types";

export type OrchestratorIntent =
  | "plan_schedule"
  | "check_conflict"
  | "find_room"
  | "find_tutor"
  | "explain_schedule"
  | "reschedule"
  | "import_deals"
  | "report"
  | "notify"
  | "unknown";

export interface OrchestratorInput {
  userMessage: string;
  /** Optional structured override — UI may set this directly. */
  intent?: OrchestratorIntent;
  /** Payload to forward to the chosen sub-agent. Schema depends on intent. */
  subAgentPayload?: unknown;
}

export interface OrchestratorOutput {
  intent: OrchestratorIntent;
  routedTo: AgentName | null;
  subResponse: AgentResponse | null;
  message: string;
  proposals: AgentProposal[];
  nextActions: NextAction[];
}

const INTENT_KEYWORDS: Record<OrchestratorIntent, string[]> = {
  plan_schedule: ["จัด", "วาง", "แนะนำตาราง", "plan", "schedule"],
  check_conflict: ["ชน", "ตรวจ", "conflict", "ทับ"],
  find_room: ["ห้อง", "room"],
  find_tutor: ["ครู", "ติวเตอร์", "tutor"],
  explain_schedule: ["ทำไม", "อธิบาย", "explain"],
  reschedule: ["ย้าย", "เลื่อน", "reschedule", "เปลี่ยน"],
  import_deals: ["import", "นำเข้า", "sheet"],
  report: ["สรุป", "รายงาน", "report"],
  notify: ["แจ้ง", "ส่ง", "notify"],
  unknown: [],
};

export function classifyIntent(message: string): OrchestratorIntent {
  const lower = message.toLowerCase();
  let best: OrchestratorIntent = "unknown";
  let bestScore = 0;
  for (const [intent, kws] of Object.entries(INTENT_KEYWORDS) as [
    OrchestratorIntent,
    string[],
  ][]) {
    if (intent === "unknown") continue;
    let s = 0;
    for (const kw of kws) {
      if (lower.includes(kw.toLowerCase())) s++;
    }
    if (s > bestScore) {
      best = intent;
      bestScore = s;
    }
  }
  return best;
}

const INTENT_AGENT: Record<OrchestratorIntent, AgentName | null> = {
  plan_schedule: "schedule_planner",
  check_conflict: "conflict_checker",
  find_room: "room",
  find_tutor: "tutor",
  explain_schedule: "schedule_planner",
  reschedule: "exception_recovery",
  import_deals: "import_sync",
  report: "report",
  notify: "notification",
  unknown: null,
};

export class MainOrchestratorAgent extends BaseAgent<
  OrchestratorInput,
  OrchestratorOutput
> {
  readonly name: AgentName = "orchestrator";
  readonly description = "Route user intent to the correct sub-agent";

  async run(
    req: AgentRequest<OrchestratorInput>,
  ): Promise<AgentResponse<OrchestratorOutput>> {
    const started = Date.now();
    const input = req.payload;
    const intent = input.intent ?? classifyIntent(input.userMessage);
    const target = INTENT_AGENT[intent];

    if (!target) {
      return buildSuccess(this.name, {
        data: {
          intent,
          routedTo: null,
          subResponse: null,
          message: "ขลุ่ยยังไม่เข้าใจคำสั่งครับ ลองพิมพ์ใหม่หรือเลือกจากเมนู",
          proposals: [],
          nextActions: [],
        },
        message: "intent: unknown",
        startedAt: started,
      });
    }

    const agent = getAgent(target);
    const subRequest: AgentRequest = {
      agentName: target,
      intent: intent,
      payload: input.subAgentPayload ?? {},
      userContext: req.userContext,
      timestamp: new Date().toISOString(),
    };
    const sub = await safeRun(agent, subRequest);

    const message = buildThaiAdminResponse(intent, sub);
    return buildSuccess(this.name, {
      data: {
        intent,
        routedTo: target,
        subResponse: sub,
        message,
        proposals: sub.proposals,
        nextActions: buildNextActions(intent, sub),
      },
      message,
      warnings: sub.warnings,
      errors: sub.errors,
      proposals: sub.proposals,
      nextActions: buildNextActions(intent, sub),
      startedAt: started,
    });
  }
}

export function buildThaiAdminResponse(
  intent: OrchestratorIntent,
  sub: AgentResponse,
): string {
  if (!sub.success) {
    return `${sub.message} (intent=${intent})`;
  }
  switch (intent) {
    case "plan_schedule":  return sub.message;
    case "check_conflict": return sub.message;
    case "find_room":      return sub.message;
    case "find_tutor":     return sub.message;
    case "explain_schedule": return sub.message;
    case "reschedule":     return sub.message;
    case "import_deals":   return sub.message;
    case "report":         return sub.message;
    case "notify":         return sub.message;
    case "unknown":        return "ไม่เข้าใจคำสั่งครับ";
  }
}

export function buildNextActions(
  intent: OrchestratorIntent,
  sub: AgentResponse,
): NextAction[] {
  const out: NextAction[] = [];
  if (sub.proposals.length) {
    out.push({
      label: `ดู ${sub.proposals.length} ตัวเลือก`,
      description: "เปิด panel แสดง proposal เพื่อ confirm",
    });
  }
  if (intent === "plan_schedule" && sub.proposals.length === 0) {
    out.push({
      label: "ลองหาเวลาอื่น",
      description: "เปลี่ยน preferred time แล้วเรียก planner อีกครั้ง",
    });
  }
  if (intent === "check_conflict" && sub.warnings.length) {
    out.push({
      label: "ดูคำเตือน",
      description: "เปิด detail panel เพื่อตรวจ warning",
    });
  }
  return out;
}
