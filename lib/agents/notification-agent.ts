/**
 * NotificationAgent — drafts Thai-language notifications. Phase-1 is
 * in-app + a draft adapter for LINE/email. Sending is Phase-5.
 */

import { BaseAgent, buildSuccess } from "./base";
import type {
  AgentName,
  AgentProposal,
  AgentRequest,
  AgentResponse,
  ScheduleEvent,
  Tutor,
} from "./types";

export type NotificationEventKind =
  | "schedule_created"
  | "schedule_updated"
  | "schedule_cancelled"
  | "schedule_rescheduled"
  | "tutor_changed"
  | "room_changed"
  | "class_starting_soon"
  | "pending_deal_waiting"
  | "conflict_detected"
  | "import_completed";

export type NotificationChannel = "in_app" | "line" | "email" | "sms";
export type NotificationRecipientType = "admin" | "tutor" | "customer";

export interface NotificationRecipient {
  type: NotificationRecipientType;
  id: string;
  displayName: string;
  /** Channel-specific address (e.g. line user id, email). */
  address: string | null;
}

export type NotificationStatus = "queued" | "sent" | "failed" | "read";

export interface NotificationDraft {
  id: string;
  event: NotificationEventKind;
  recipient: NotificationRecipient;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  createdAt: string;
}

export interface NotificationAgentInput {
  event: NotificationEventKind;
  scheduleEvent?: ScheduleEvent;
  tutor?: Tutor;
  /** Optional caller-defined recipients; agent falls back to event-derived defaults. */
  recipients?: NotificationRecipient[];
  /** Free-form extras for template substitution. */
  extras?: Record<string, string>;
}

export interface NotificationAgentOutput {
  drafts: NotificationDraft[];
}

const DOW_TH = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

export class NotificationAgent extends BaseAgent<
  NotificationAgentInput,
  NotificationAgentOutput
> {
  readonly name: AgentName = "notification";
  readonly description = "ร่างข้อความแจ้งเตือนภาษาไทยตาม event (ไม่ส่งจริง)";

  async run(
    req: AgentRequest<NotificationAgentInput>,
  ): Promise<AgentResponse<NotificationAgentOutput>> {
    const started = Date.now();
    const input = req.payload;
    const recipients = input.recipients ?? this.defaultRecipients(input);
    const drafts: NotificationDraft[] = recipients.map((r) =>
      this.buildDraft(input, r),
    );
    const proposals: AgentProposal[] = drafts
      .filter((d) => d.channel !== "in_app")
      .map((d) => ({
        kind: "notify.send",
        payload: { channel: d.channel as "line" | "email" | "sms", recipient: d.recipient.address ?? "", text: d.body },
        rationale: `notify ${d.recipient.type} about ${input.event}`,
        confidence: 0.9,
        agentName: this.name,
        createdAt: new Date().toISOString(),
      }));
    return buildSuccess(this.name, {
      data: { drafts },
      message: `สร้าง draft ${drafts.length} ข้อความ`,
      proposals,
      startedAt: started,
    });
  }

  private buildDraft(
    input: NotificationAgentInput,
    recipient: NotificationRecipient,
  ): NotificationDraft {
    const ev = input.scheduleEvent;
    const dow = ev ? DOW_TH[ev.dayOfWeek - 1] : "(วันไม่ระบุ)";
    const time = ev ? `${ev.startTime.slice(0, 5)}-${ev.endTime.slice(0, 5)}` : "(เวลาไม่ระบุ)";
    const title = ev?.title ?? input.extras?.title ?? "(ไม่ระบุชื่อคลาส)";
    let body = "";
    switch (input.event) {
      case "schedule_created":
        body = `คุณมีคลาสใหม่ ${title} วัน${dow} เวลา ${time}`;
        break;
      case "schedule_updated":
        body = `ตารางคลาส ${title} ถูกปรับเป็น วัน${dow} เวลา ${time}`;
        break;
      case "schedule_cancelled":
        body = `คลาส ${title} วัน${dow} เวลา ${time} ถูกยกเลิก`;
        break;
      case "schedule_rescheduled":
        body = `คลาส ${title} ถูกเลื่อนเป็น วัน${dow} เวลา ${time}`;
        break;
      case "tutor_changed":
        body = `คลาส ${title} เปลี่ยนครูเป็น ${input.tutor?.name ?? "(ครูใหม่)"}`;
        break;
      case "room_changed":
        body = `คลาส ${title} เปลี่ยนเป็นห้อง ${input.extras?.roomName ?? "(ห้องใหม่)"}`;
        break;
      case "class_starting_soon":
        body = `คลาส ${title} กำลังจะเริ่มในอีกไม่นาน`;
        break;
      case "pending_deal_waiting":
        body = `มีดีลรอจัดตาราง ${input.extras?.dealName ?? ""}`;
        break;
      case "conflict_detected":
        body = `พบตารางชน: ${input.extras?.conflictMessage ?? "ตรวจสอบใน dashboard"}`;
        break;
      case "import_completed":
        body = `นำเข้าสำเร็จ ${input.extras?.count ?? ""} รายการ`;
        break;
    }
    return {
      id: `notif_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
      event: input.event,
      recipient,
      channel: recipient.address ? this.chooseChannel(recipient) : "in_app",
      subject: null,
      body,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
  }

  private chooseChannel(r: NotificationRecipient): NotificationChannel {
    if (!r.address) return "in_app";
    if (r.address.includes("@")) return "email";
    if (r.address.startsWith("U") && r.address.length > 10) return "line"; // LINE user id heuristic
    return "in_app";
  }

  private defaultRecipients(input: NotificationAgentInput): NotificationRecipient[] {
    const out: NotificationRecipient[] = [];
    if (input.tutor) {
      out.push({
        type: "tutor",
        id: input.tutor.id,
        displayName: input.tutor.name,
        address: null,
      });
    }
    out.push({
      type: "admin",
      id: "admin",
      displayName: "Admin",
      address: null,
    });
    return out;
  }
}
