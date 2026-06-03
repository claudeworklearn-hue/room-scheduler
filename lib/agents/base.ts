/**
 * Base contract for every agent.
 *
 * Rules every concrete agent MUST follow:
 *   1. Pure logic + light I/O (read-only Supabase queries are OK).
 *   2. Never call the DB to write. Return Proposals; the caller routes
 *      them through commitScheduleWithValidation.
 *   3. canRun() is the static permission gate; orchestrator filters here
 *      before dispatching.
 *   4. run() must always return — wrap your own throws in buildError().
 */

import type {
  AgentName,
  AgentRequest,
  AgentResponse,
  AgentProposal,
  NextAction,
  UserContext,
} from "./types";

export interface Agent<TPayload = unknown, TData = unknown> {
  readonly name: AgentName;
  readonly description: string;
  canRun(ctx: UserContext): boolean;
  run(request: AgentRequest<TPayload>): Promise<AgentResponse<TData>>;
}

// ============================================================================
// Helpers — uniform response shape
// ============================================================================

export interface SuccessOpts<TData> {
  message?: string;
  warnings?: string[];
  errors?: string[];
  nextActions?: NextAction[];
  proposals?: AgentProposal[];
  /** Internal — when run() captured Date.now() at start. */
  startedAt?: number;
  data: TData;
}

export function buildSuccess<TData>(
  agentName: AgentName,
  opts: SuccessOpts<TData>,
): AgentResponse<TData> {
  return {
    agentName,
    success: true,
    data: opts.data,
    message: opts.message ?? "ok",
    warnings: opts.warnings ?? [],
    errors: opts.errors ?? [],
    nextActions: opts.nextActions ?? [],
    proposals: opts.proposals ?? [],
    durationMs: opts.startedAt ? Date.now() - opts.startedAt : 0,
  };
}

export function buildError(
  agentName: AgentName,
  message: string,
  errors: string[] = [],
  startedAt = Date.now(),
): AgentResponse<null> {
  return {
    agentName,
    success: false,
    data: null,
    message,
    warnings: [],
    errors: errors.length ? errors : [message],
    nextActions: [],
    proposals: [],
    durationMs: Date.now() - startedAt,
  };
}

// ============================================================================
// Abstract base — subclasses define name + run().
// ============================================================================

export abstract class BaseAgent<TPayload = unknown, TData = unknown>
  implements Agent<TPayload, TData>
{
  abstract readonly name: AgentName;
  abstract readonly description: string;

  canRun(_ctx: UserContext): boolean {
    return true;
  }

  abstract run(
    request: AgentRequest<TPayload>,
  ): Promise<AgentResponse<TData>>;
}

// ============================================================================
// Small utility — guard against accidentally throwing past the agent boundary
// ============================================================================

export async function safeRun<TPayload, TData>(
  agent: Agent<TPayload, TData>,
  request: AgentRequest<TPayload>,
): Promise<AgentResponse<TData> | AgentResponse<null>> {
  const startedAt = Date.now();
  try {
    if (!agent.canRun(request.userContext)) {
      return buildError(
        agent.name,
        `agent ${agent.name} ปิดสำหรับ role ${request.userContext.role}`,
        [],
        startedAt,
      );
    }
    return await agent.run(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return buildError(agent.name, message, [message], startedAt);
  }
}
