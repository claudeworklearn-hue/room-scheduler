# Sub-Agent System

ระบบ AI-Agent ของ Knowledge Academy Room Scheduler

---

## หลักการเหล็ก

1. **AI Agent ไม่ commit DB เอง** ทุกการเขียนข้อมูลผ่าน `commitScheduleWithValidation` เท่านั้น
2. **Conflict Checker เป็น deterministic** ห้าม LLM ตัดสินใจเรื่องตารางชน
3. **Backend = source of truth** Zod + EXCLUDE constraints + per-action permission คุมขั้นสุดท้าย
4. **Audit log ทุก mutation** ผ่าน `lib/audit.ts`
5. **ภาษาไทย** สำหรับข้อความ user-facing; English สำหรับ types/code

---

## Architecture

```
┌──────────────── UI / API ─────────────────┐
│  /api/agents (POST) ← unified entry       │
│  /admin/agents      ← demo panel          │
└─────────────────┬─────────────────────────┘
                  ↓
            Orchestrator
                  │
   ┌──────────────┼─────────────────────────┐
   │              │                         │
DealIntake   SchedulePlanner    ConflictChecker (LLM-free wrapper)
   │              │                         │
   ↓              ↓                         ↓
RoomAgent ─┐  TutorAgent ─┐   lib/conflict-checker.ts  (PURE)
           │              │                         │
           └──────┬───────┘                         │
                  ↓                                 │
            Proposals[]                             │
                  │                                 │
                  ↓                                 │
       commitScheduleWithValidation ←───────────────┘
                  │
                  ↓
           Server Actions  →  Supabase
                  │
                  ↓
            createAuditLog
```

**สี่ระดับการเช็ค (defense in depth):**
1. Agent's own filter — drops obvious junk
2. `checkConflicts()` — deterministic
3. `commitScheduleWithValidation()` — re-checks immediately before write
4. Postgres `EXCLUDE` constraint — last line; rejects anything the upper layers missed

---

## Agent Catalog

| Name | File | Role |
|---|---|---|
| Main Orchestrator | `lib/agents/orchestrator.ts` | จำแนก intent + route → sub-agent + รวมคำตอบ |
| Deal Intake | `lib/agents/intake-agent.ts` | normalize ดีล + parse ภาษาไทย (เช้า/บ่าย/เย็น) |
| Schedule Planner | `lib/agents/planner-agent.ts` | ผลิต top-N slot recommendations (ผ่าน ConflictChecker) |
| Conflict Checker | `lib/agents/conflict-agent.ts` | wraps deterministic `lib/conflict-checker.ts` |
| Room | `lib/agents/room-agent.ts` | หาห้องว่าง/ให้คะแนน/อธิบาย/utilization |
| Tutor | `lib/agents/tutor-agent.ts` | หาครู skill ตรง + workload check |
| Notification | `lib/agents/notification-agent.ts` | draft ข้อความภาษาไทย — ไม่ส่งจริง |
| Report | `lib/agents/report-agent.ts` | สรุป weekly / utilization / workload / pending |
| Import/Sync | `lib/agents/import-agent.ts` | CSV/Sheet → ImportPlan + dry-run + conflict |
| Exception Recovery | `lib/agents/recovery-agent.ts` | เสนอทางแก้: เปลี่ยนครู/ห้อง/เวลา/แตกคลาส |

---

## วิธีเรียก Agent

### ฝั่ง Server (ภายในโค้ด)

```typescript
import { getAgent } from "@/lib/agents/registry";
import { safeRun } from "@/lib/agents/base";

const planner = getAgent("schedule_planner");
const response = await safeRun(planner, {
  agentName: "schedule_planner",
  intent: "plan",
  payload: { request, context, topN: 5 },
  userContext: { userId: "u1", role: "owner", branchId: null, pinUnlocked: true },
  timestamp: new Date().toISOString(),
});
```

### ฝั่ง Client (UI)

```typescript
const res = await fetch("/api/agents", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    agentName: "schedule_planner",
    payload: { ... },
    pin,    // ส่ง PIN เพื่อ claim role=owner
  }),
});
const json = await res.json();
```

---

## Proposal Lifecycle

```
Agent.run() ──→ AgentResponse { proposals: AgentProposal[] }
                                          │
                                          ▼
                            UI shows + admin reviews
                                          │
                          ┌───────────────┴────────────────┐
                       reject                            confirm
                          │                                │
                       ignore               commitScheduleWithValidation(proposal)
                                                           │
                                              ┌────────────┴────────────┐
                                         permission                 conflict
                                          check                     re-check
                                              │                         │
                                              ▼                         ▼
                                          allowed?                  isValid?
                                              │                         │
                                              └─────────┬───────────────┘
                                                        ▼
                                                 Server Action
                                                        │
                                                        ▼
                                                    Supabase
                                                        │
                                                        ▼
                                                createAuditLog
```

**Proposal kinds:**
- `pending.create | pending.update | pending.delete`
- `event.create | event.update | event.move | event.delete`
- `notify.send` (drafted only — Phase-5 sends)
- `import.apply`
- `noop`

---

## Conflict Checker — กฎ

ดู `lib/conflict-checker.ts` เป็น source of truth

| Rule | Type | Severity |
|---|---|---|
| Same room + day + overlap | `room_overlap` | error |
| Same tutor + day + overlap (onsite) | `tutor_overlap` | error |
| Students > room.capacity | `room_capacity` | error |
| Room inactive / maintenance | `room_unavailable` | error |
| Outside business hours (08:00–23:00) | `outside_business_hours` | error |
| endTime ≤ startTime | `invalid_duration` | error |
| Required subject ∉ tutor.skills | `tutor_skill_mismatch` | warning |
| Tutor over weekly/daily max | `tutor_unavailable` | warning |
| Room missing required equipment | `room_unavailable` | warning |

**Buffer:** `hasTimeOverlap(..., bufferMinutes)` รองรับ buffer ระหว่างคลาส

---

## คำสั่ง dev

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Manual smoke (no test runner installed yet)
npx tsx tests/conflict-checker.test.ts
npx tsx tests/agents.test.ts
```

---

## Folder layout

```
lib/
├── conflict-checker.ts           # ← PURE deterministic
├── schedule-commit.ts            # ← SINGLE commit gateway
├── audit.ts                      # ← createAuditLog helper
├── edit-pin.ts                   # ← Phase-1 permission gate (existing)
└── agents/
    ├── types.ts                  # Domain + agent contracts
    ├── base.ts                   # BaseAgent + buildSuccess/Error + safeRun
    ├── registry.ts               # Lazy agent factory by name
    ├── orchestrator.ts
    ├── intake-agent.ts
    ├── planner-agent.ts
    ├── conflict-agent.ts
    ├── room-agent.ts
    ├── tutor-agent.ts
    ├── notification-agent.ts
    ├── report-agent.ts
    ├── import-agent.ts
    ├── recovery-agent.ts
    ├── prompts/
    │   └── index.ts              # System prompts per agent (versioned)
    └── seed/
        └── mock-data.ts          # Test fixtures

app/
├── api/agents/route.ts           # POST entry point
└── admin/agents/page.tsx         # demo UI

components/agents/AgentPanel.tsx  # demo panel

tests/
├── conflict-checker.test.ts      # 10 cases from Phase-15 spec
└── agents.test.ts                # intake + planner + room + tutor + orchestrator

docs/agents.md                    # this file
```

---

## วิธีเพิ่ม Agent ใหม่

1. สร้าง `lib/agents/<your-agent>.ts` ที่ `extends BaseAgent`
2. เติม `AgentName` ใหม่ใน `lib/agents/types.ts`
3. เพิ่ม `new YourAgent()` ใน `buildRegistry()` ของ `registry.ts`
4. เพิ่ม system prompt ใน `lib/agents/prompts/index.ts`
5. อัพเดท intent routing ใน `orchestrator.ts` (`INTENT_AGENT`)
6. เขียน test ใน `tests/agents.test.ts`

---

## วิธี debug conflict

1. หา `event_id` จาก `/admin/room-schedule` (คลิก event → URL drawer)
2. POST `/api/agents` body:
   ```json
   {
     "agentName": "conflict_checker",
     "payload": {
       "mode": "single",
       "candidate": {
         "dayOfWeek": 3,
         "startTime": "17:30",
         "endTime": "19:30",
         "roomId": "R03",
         "tutorId": "T03"
       },
       "existingEvents": [/* paste current snapshot */]
     },
     "pin": "pang001"
   }
   ```
3. ตอบกลับมี `conflicts[]` พร้อม `suggestedFix` เป็นภาษาไทย

---

## ข้อจำกัดที่ต้องระวัง

| Risk | Mitigation |
|---|---|
| LLM "หลอน" แก้ตาราง | ห้าม path ใดเรียก Supabase write จาก agent — commit ผ่าน gateway |
| Race condition INSERT พร้อมกัน | DB EXCLUDE constraint + commit gateway re-check |
| Cross-project drift (Attendance) | cache 60s, fall back to planned count |
| Permission escalation ผ่าน API | route handler override `userContext.role` ตาม PIN |
| Bulk import ทับข้อมูลเดิม | strategy field + dry-run mandatory ก่อน apply |
| Time-zone drift | template grid ใช้ dayOfWeek + time (ไม่มี date); date-bound ยังไม่ enable |

---

## Roadmap ที่ยังเหลือ

- [ ] **Phase 5** — LINE/email send pipe (มี draft layer แล้ว)
- [ ] **Phase 6** — Supabase Auth + per-tutor role (เลิก PIN gate)
- [ ] **Phase 5** — Google Sheet adapter จริง (มี CSV adapter แล้ว)
- [ ] Wire `apply=true` ใน `commitScheduleWithValidation` ลง Server Actions ปัจจุบัน
- [ ] DB migration `0014_audit_log` + `agent_runs` table
- [ ] Drag-drop pre-flight: เรียก `/api/agents` (conflict_checker) ก่อน `moveEvent`
