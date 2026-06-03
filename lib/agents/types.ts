/**
 * Agent layer — shared data contracts.
 *
 * Everything in this file is **plain TypeScript** with no I/O. Both
 * deterministic services (conflict-checker, schedule-commit) and LLM-backed
 * agents (planner, intake, …) import from here so they speak the same
 * shape.
 *
 * Naming:
 *   - Domain entities use camelCase (Room, Tutor, ScheduleEvent…). The DB
 *     schema is snake_case; mapping happens in adapter functions next
 *     to wherever Supabase is read. We deliberately do not couple this
 *     file to lib/supabase/types.ts so the agent layer stays portable.
 */

// ============================================================================
// Primitives
// ============================================================================

/** ISO weekday — 1=Monday .. 7=Sunday. Matches schedule_events.day_of_week. */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** "HH:MM" or "HH:MM:SS". */
export type TimeString = string;

/** ISO date "YYYY-MM-DD" (no time, no zone). */
export type DateString = string;

export type EntityStatus = "active" | "inactive" | "maintenance";

export type RoomType = "classroom" | "lab" | "meeting" | "studio" | "other";

export type DeliveryMode = "onsite" | "online" | "hybrid";

/** Used by Tutor.role. */
export type TutorRole = "owner" | "manager" | "tutor";

export type GradeLevel =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6"
  | "M1" | "M2" | "M3" | "M4" | "M5" | "M6"
  | "ETC";

// ============================================================================
// Availability windows
// ============================================================================

/** Recurring weekly availability — "every Monday 17:00–19:00". */
export interface AvailabilitySlot {
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
}

/** One-off blocking — "this date 14:00–16:00 because of sick day". */
export interface UnavailableSlot {
  date: DateString;
  startTime: TimeString;
  endTime: TimeString;
  reason: string;
}

// ============================================================================
// Room
// ============================================================================

export interface Room {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
  status: EntityStatus;
  unavailableSlots: UnavailableSlot[];
  notes: string | null;

  // Compatibility with the existing rooms table — optional so callers
  // who only need {id, name, capacity, ...} keep working.
  code?: string;
  building?: string | null;
  roomType?: RoomType;
  sortOrder?: number;
  branchId?: string;
}

// ============================================================================
// Tutor
// ============================================================================

export interface Tutor {
  id: string;
  name: string;
  shortCode: string;
  skills: string[]; // subject keys — physics / chem / bio / math / science / english / …
  availableSlots: AvailabilitySlot[];
  unavailableSlots: UnavailableSlot[];
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  status: EntityStatus;
  color: string | null;
  role: TutorRole;

  branchId?: string | null;
}

// ============================================================================
// Course
// ============================================================================

export interface Course {
  id: string;
  name: string;
  subject: string;
  level: GradeLevel;
  defaultDurationMinutes: number;
  requiredEquipment: string[];
  preferredRoomType: RoomType | null;
  maxStudents: number | null;
  notes: string | null;
}

// ============================================================================
// Deal (the "ดีลรอจัดตาราง" — superset of pending_bookings)
// ============================================================================

export type DealStatus =
  | "pending_schedule"
  | "scheduled"
  | "blocked"
  | "cancelled";

export type DealPriority = "low" | "normal" | "high" | "urgent";

export interface TimeRange {
  start: TimeString;
  end: TimeString;
}

export interface RoomRequirement {
  minCapacity?: number;
  requiredEquipment?: string[];
  preferredBuilding?: string | null;
  preferredRoomType?: RoomType | null;
}

export interface Deal {
  id: string;
  customerName: string;
  courseId: string | null;
  studentCount: number;
  preferredDays: DayOfWeek[];
  preferredTimeRanges: TimeRange[];
  startDate: DateString | null;
  endDate: DateString | null;
  durationMinutes: number;
  requiredTutorSkills: string[];
  roomRequirement: RoomRequirement | null;
  priority: DealPriority;
  status: DealStatus;
  notes: string | null;
}

// ============================================================================
// ScheduleEvent
// ============================================================================

export type ScheduleEventStatus =
  | "draft"
  | "confirmed"
  | "cancelled"
  | "rescheduled";

export type ScheduleEventSource =
  | "manual"
  | "drag_drop"
  | "ai_suggested"
  | "imported";

export interface ScheduleEvent {
  id: string;
  dealId: string | null;
  courseId: string | null;
  roomId: string | null;
  tutorId: string | null;
  title: string;
  /** ISO date for non-recurring instances; null for the recurring template (most rows today). */
  date: DateString | null;
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
  durationMinutes: number;
  studentCount: number | null;
  status: ScheduleEventStatus;
  source: ScheduleEventSource;
  createdBy: string | null;
  updatedBy: string | null;

  // Carried for conflict logic — optional so legacy rows stay assignable.
  deliveryMode?: DeliveryMode;
}

// ============================================================================
// Conflict
// ============================================================================

export type ConflictType =
  | "room_overlap"
  | "tutor_overlap"
  | "room_capacity"
  | "tutor_skill_mismatch"
  | "tutor_unavailable"
  | "room_unavailable"
  | "outside_business_hours"
  | "invalid_duration"
  | "permission_denied"
  | "missing_required_field";

export type ConflictSeverity = "error" | "warning" | "info";

export type AffectedEntityType =
  | "room"
  | "tutor"
  | "course"
  | "deal"
  | "schedule_event";

export interface Conflict {
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  affectedEntityType: AffectedEntityType;
  affectedEntityId: string;
  relatedScheduleEventIds: string[];
  suggestedFix: string | null;
}

// ============================================================================
// Recommendation — what the Planner returns
// ============================================================================

export interface ScheduleRecommendation {
  id: string;
  date: DateString | null;
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
  roomId: string | null;
  tutorId: string | null;
  /** 0..1 — higher is better. 0 = blocked by hard conflict. */
  score: number;
  reasons: string[];
  warnings: string[];
  conflicts: Conflict[];
  isValid: boolean;
}

// ============================================================================
// Conflict-checker IO
// ============================================================================

/** What the Conflict Checker asks about. Slim on purpose. */
export interface ScheduleCandidate {
  /** Omit when checking a not-yet-saved candidate; pass the existing
   *  event id when re-checking an edit so it doesn't self-conflict. */
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
  roomId: string | null;
  tutorId: string | null;
  studentCount?: number | null;
  deliveryMode?: DeliveryMode;
}

export interface ConflictCheckInput {
  candidate: ScheduleCandidate;
  existingEvents: ScheduleEvent[];
  room?: Room | null;
  tutor?: Tutor | null;
  /** Skills the slot requires (from Course or Deal). */
  requiredSubjects?: string[];
  /** Equipment the slot requires (from Course). */
  requiredEquipment?: string[];
  /** Defaults to lib/time/grid.ts business hours (08:00–23:00). */
  businessHours?: { start: TimeString; end: TimeString };
}

export interface ConflictCheckResult {
  conflicts: Conflict[];
  /** true iff no conflict has severity === "error". */
  isValid: boolean;
}

// ============================================================================
// Agent registry
// ============================================================================

export type AgentName =
  | "orchestrator"
  | "deal_intake"
  | "schedule_planner"
  | "conflict_checker"
  | "room"
  | "tutor"
  | "notification"
  | "report"
  | "import_sync"
  | "exception_recovery";

export type UserRole =
  | "owner"
  | "manager"
  | "tutor"
  | "anonymous"
  | "system";

export interface UserContext {
  userId: string | null;
  role: UserRole;
  branchId: string | null;
  /** Current PIN gate status — bridges Phase-1 PIN to Phase-6 auth. */
  pinUnlocked: boolean;
}

export interface AgentRequest<TPayload = unknown> {
  agentName: AgentName;
  intent: string;
  payload: TPayload;
  userContext: UserContext;
  timestamp: string; // ISO 8601
}

export interface NextAction {
  label: string;
  description: string;
  agentName?: AgentName;
  proposal?: AgentProposal;
}

export interface AgentResponse<TData = unknown> {
  agentName: AgentName;
  success: boolean;
  data: TData | null;
  message: string;
  warnings: string[];
  errors: string[];
  nextActions: NextAction[];
  /** Things the agent SUGGESTS but did not commit. */
  proposals: AgentProposal[];
  durationMs: number;
}

// ============================================================================
// Proposal — the only currency in which agents move state
// ============================================================================

export type AgentProposalKind =
  | "pending.create"
  | "pending.update"
  | "pending.delete"
  | "event.create"
  | "event.update"
  | "event.move"
  | "event.delete"
  | "notify.send"
  | "import.apply"
  | "noop";

interface AgentProposalBase {
  kind: AgentProposalKind;
  rationale: string;
  /** 0..1 — caller may threshold before auto-applying. */
  confidence: number;
  agentName: AgentName;
  createdAt: string;
}

export interface ProposalPendingCreate extends AgentProposalBase {
  kind: "pending.create";
  payload: Partial<Deal>;
}

export interface ProposalPendingUpdate extends AgentProposalBase {
  kind: "pending.update";
  payload: { id: string; patch: Partial<Deal> };
}

export interface ProposalPendingDelete extends AgentProposalBase {
  kind: "pending.delete";
  payload: { id: string };
}

export interface ProposalEventCreate extends AgentProposalBase {
  kind: "event.create";
  payload: Partial<ScheduleEvent>;
}

export interface ProposalEventUpdate extends AgentProposalBase {
  kind: "event.update";
  payload: { id: string; patch: Partial<ScheduleEvent> };
}

export interface ProposalEventMove extends AgentProposalBase {
  kind: "event.move";
  payload: {
    id: string;
    dayOfWeek: DayOfWeek;
    startTime: TimeString;
    roomId: string | null;
  };
}

export interface ProposalEventDelete extends AgentProposalBase {
  kind: "event.delete";
  payload: { id: string };
}

export interface ProposalNotifySend extends AgentProposalBase {
  kind: "notify.send";
  payload: {
    channel: "line" | "email" | "sms";
    recipient: string;
    text: string;
  };
}

export interface ImportPlanRow {
  action: "create" | "update" | "skip";
  rowIndex: number;
  target: Partial<ScheduleEvent>;
  reason: string;
}

export interface ProposalImportApply extends AgentProposalBase {
  kind: "import.apply";
  payload: { rows: ImportPlanRow[] };
}

export interface ProposalNoop extends AgentProposalBase {
  kind: "noop";
  payload: Record<string, never>;
}

export type AgentProposal =
  | ProposalPendingCreate
  | ProposalPendingUpdate
  | ProposalPendingDelete
  | ProposalEventCreate
  | ProposalEventUpdate
  | ProposalEventMove
  | ProposalEventDelete
  | ProposalNotifySend
  | ProposalImportApply
  | ProposalNoop;

// ============================================================================
// Agent run log
// ============================================================================

export type AgentRunStatus = "success" | "error" | "blocked" | "pending";

export interface AgentRunLog {
  id: string;
  agentName: AgentName;
  input: AgentRequest;
  output: AgentResponse | null;
  status: AgentRunStatus;
  createdAt: string;
  createdBy: string | null;
}
