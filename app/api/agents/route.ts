/**
 * POST /api/agents — single entry point the UI uses to talk to any agent.
 *
 * Body:
 *   { agentName: AgentName, intent: string, payload: unknown,
 *     userContext: UserContext }
 *
 * The route does NOT trust the UI's userContext blindly — it overrides
 * any role escalation by re-checking the PIN gate / cookie before the
 * sub-agent runs. (Phase-6 will tie this to Supabase Auth properly.)
 */

import { NextResponse } from "next/server";
import { checkEditPin } from "@/lib/edit-pin";
import { getAgent } from "@/lib/agents/registry";
import { safeRun } from "@/lib/agents/base";
import type { AgentName, AgentRequest, UserContext } from "@/lib/agents/types";

interface Body {
  agentName: AgentName;
  intent?: string;
  payload?: unknown;
  /** Untrusted — re-validated below. */
  userContext?: UserContext;
  /** Optional PIN to claim admin role for this single call. */
  pin?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.agentName) {
    return NextResponse.json({ error: "agentName required" }, { status: 400 });
  }

  // Build a safe UserContext — never trust the client.
  const pinErr = checkEditPin(body.pin);
  const userContext: UserContext = {
    userId: null,
    role: pinErr ? "anonymous" : "owner",
    branchId: null,
    pinUnlocked: !pinErr,
  };

  let agent;
  try {
    agent = getAgent(body.agentName);
  } catch {
    return NextResponse.json({ error: "unknown agent" }, { status: 404 });
  }

  const request: AgentRequest = {
    agentName: body.agentName,
    intent: body.intent ?? "agent_call",
    payload: body.payload ?? {},
    userContext,
    timestamp: new Date().toISOString(),
  };

  const response = await safeRun(agent, request);
  return NextResponse.json(response);
}
