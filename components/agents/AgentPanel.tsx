"use client";

import { useState } from "react";
import type { AgentName } from "@/lib/agents/types";
import { useEditPin } from "@/components/edit-mode/useEditMode";

type AgentMeta = { name: AgentName; description: string };

export function AgentPanel({ agents }: { agents: AgentMeta[] }) {
  const { pin } = useEditPin();
  const [selected, setSelected] = useState<AgentName>(agents[0]?.name ?? "orchestrator");
  const [payload, setPayload] = useState<string>(samplePayload(selected));
  const [response, setResponse] = useState<unknown | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResponse(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch (e) {
        throw new Error("Payload ไม่ใช่ JSON ที่ถูกต้อง: " + (e as Error).message);
      }
      const r = await fetch("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentName: selected,
          payload: parsed,
          pin,
        }),
      });
      const json = await r.json();
      setResponse(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  function pickAgent(name: AgentName) {
    setSelected(name);
    setPayload(samplePayload(name));
    setResponse(null);
    setError(null);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[260px,1fr]">
      <aside className="rounded-2xl border border-gray-200 bg-white p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Agents ({agents.length})
        </div>
        <ul className="flex flex-col gap-1">
          {agents.map((a) => (
            <li key={a.name}>
              <button
                type="button"
                onClick={() => pickAgent(a.name)}
                className={[
                  "w-full rounded-lg px-3 py-2 text-left text-sm transition",
                  selected === a.name
                    ? "bg-brand-500 text-white shadow"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                <div className="font-medium">{labelFor(a.name)}</div>
                <div
                  className={
                    selected === a.name
                      ? "text-[11px] text-amber-50/90"
                      : "text-[11px] text-gray-500"
                  }
                >
                  {a.description}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex flex-col gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            payload (JSON)
          </div>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs focus:border-brand-400 focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              POST → <code className="font-mono">/api/agents</code>
              {pin ? " · ใส่ PIN แล้ว" : " · ไม่ได้ใส่ PIN"}
            </div>
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              {running ? "กำลังเรียก..." : "▶ Run"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {response != null && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              response
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] text-emerald-200">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}

function labelFor(name: AgentName): string {
  switch (name) {
    case "orchestrator": return "Main Orchestrator";
    case "deal_intake": return "Deal Intake";
    case "schedule_planner": return "Schedule Planner";
    case "conflict_checker": return "Conflict Checker";
    case "room": return "Room Agent";
    case "tutor": return "Tutor Agent";
    case "notification": return "Notification";
    case "report": return "Report";
    case "import_sync": return "Import / Sync";
    case "exception_recovery": return "Exception Recovery";
  }
}

function samplePayload(name: AgentName): string {
  switch (name) {
    case "orchestrator":
      return JSON.stringify(
        { userMessage: "ตรวจตารางชนไหม", subAgentPayload: { mode: "single", candidate: { dayOfWeek: 3, startTime: "17:30", endTime: "19:30", roomId: null, tutorId: null }, existingEvents: [] } },
        null,
        2,
      );
    case "conflict_checker":
      return JSON.stringify(
        { mode: "single", candidate: { dayOfWeek: 3, startTime: "10:00", endTime: "12:00", roomId: "R1", tutorId: null }, existingEvents: [] },
        null,
        2,
      );
    case "room":
      return JSON.stringify(
        { action: "list", rooms: [], events: [] },
        null,
        2,
      );
    case "tutor":
      return JSON.stringify(
        { action: "list", tutors: [], events: [] },
        null,
        2,
      );
    case "deal_intake":
      return JSON.stringify(
        { deal: { id: "D-demo", customerName: "ทดสอบ", studentCount: 3, durationMinutes: 90 }, freeText: "เสาร์เช้า ครูสอนคณิตได้" },
        null,
        2,
      );
    case "schedule_planner":
      return JSON.stringify(
        { request: { dealId: "D001", courseId: null, studentCount: 5, durationMinutes: 90, preferredDays: [6], preferredTimeRanges: [{ start: "09:00", end: "12:00" }], startDate: null, endDate: null, requiredTutorSkills: ["math"], requiredEquipment: [], preferredTutorId: null, preferredRoomId: null, priority: "normal" }, context: { existingEvents: [], rooms: [], tutors: [] }, topN: 3 },
        null,
        2,
      );
    case "notification":
      return JSON.stringify(
        { event: "schedule_created", scheduleEvent: { id: "E1", dealId: null, courseId: null, roomId: "R1", tutorId: "T1", title: "คณิต ม.5", date: null, dayOfWeek: 6, startTime: "09:00:00", endTime: "10:30:00", durationMinutes: 90, studentCount: 5, status: "confirmed", source: "manual", createdBy: null, updatedBy: null }, tutor: { id: "T1", name: "ครูเกรท", shortCode: "GRT", skills: ["math"], availableSlots: [], unavailableSlots: [], maxHoursPerDay: 8, maxHoursPerWeek: 30, status: "active", color: null, role: "tutor" } },
        null,
        2,
      );
    case "report":
      return JSON.stringify(
        { kind: "weeklyScheduleSummary", events: [], deals: [], rooms: [], tutors: [] },
        null,
        2,
      );
    case "import_sync":
      return JSON.stringify(
        { target: "schedule_events", rows: [], dryRun: true },
        null,
        2,
      );
    case "exception_recovery":
      return JSON.stringify(
        { problem: "tutor_absent", scheduleEventId: "E1", context: { events: [], rooms: [], tutors: [] } },
        null,
        2,
      );
  }
}
