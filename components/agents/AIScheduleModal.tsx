"use client";

/**
 * AIScheduleModal — wraps the SchedulePlannerAgent for the
 * /admin/waiting-list page.
 *
 * Flow:
 *   1. Caller passes a pending booking + a snapshot of rooms + events.
 *   2. Modal posts /api/agents { agentName: "schedule_planner", … }
 *      with the request derived from the pending.
 *   3. We render top-3 recommendations as cards.
 *   4. Picking one calls onPick(slot) — caller decides what to do next
 *      (typically open ScheduleFromPendingModal pre-filled and let the
 *      existing schedulePendingToEvent server action commit).
 *
 * NEVER commits to the DB itself.
 */

import { useEffect, useState } from "react";
import type {
  Room,
  ScheduleEvent,
  Tutor,
  ScheduleRecommendation,
  AgentResponse,
  DayOfWeek,
} from "@/lib/agents/types";
import type { PendingBooking } from "@/lib/supabase/types";
import { useEditPin } from "@/components/edit-mode/useEditMode";

const DOW_LABEL: Record<DayOfWeek, string> = {
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัสบดี",
  5: "ศุกร์",
  6: "เสาร์",
  7: "อาทิตย์",
};

type PickedSlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  roomId: string | null;
  tutorId: string | null;
};

type Props = {
  pending: PendingBooking;
  rooms: Room[];
  tutors: Tutor[];
  events: ScheduleEvent[];
  onPick: (slot: PickedSlot) => void;
  onClose: () => void;
};

export function AIScheduleModal({
  pending,
  rooms,
  tutors,
  events,
  onPick,
  onClose,
}: Props) {
  const { pin } = useEditPin();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<
    ScheduleRecommendation[]
  >([]);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);

  // The preferred constraint — Phase-1 keeps it simple: search every day
  // 08:00–22:00 with the pending's duration. Phase-2 will read this from
  // a Deal.preferredDays/preferredTimeRanges once we extend the schema.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const requiredSkill = guessSubjectFromTitle(pending.title_th);
        const body = {
          agentName: "schedule_planner",
          pin,
          payload: {
            request: {
              dealId: pending.id,
              courseId: pending.course_id ?? null,
              studentCount: pending.planned_student_count ?? 1,
              durationMinutes: pending.duration_minutes,
              preferredDays: [1, 2, 3, 4, 5, 6, 7],
              preferredTimeRanges: [{ start: "08:00", end: "22:00" }],
              startDate: null,
              endDate: null,
              requiredTutorSkills: requiredSkill ? [requiredSkill] : [],
              requiredEquipment: [],
              preferredTutorId: pending.tutor_profile_id ?? null,
              preferredRoomId: null,
              priority: "normal",
            },
            context: { existingEvents: events, rooms, tutors },
            topN: 5,
            slotStepMinutes: 30,
          },
        };
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as AgentResponse<{
          recommendations: ScheduleRecommendation[];
          alternativesIfNone: string[];
        }>;
        if (cancelled) return;
        if (!json.success || !json.data) {
          throw new Error(json.message || "planner ตอบไม่ได้");
        }
        setRecommendations(json.data.recommendations);
        setAlternatives(json.data.alternativesIfNone);
        setMessage(json.message);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pending, rooms, tutors, events, pin]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
          <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                🤖 ผู้ช่วยจัดตาราง · เลือกสล็อตที่แนะนำ
              </div>
              <h2 className="mt-1 text-lg font-bold text-gray-900">
                {pending.title_th}
              </h2>
              <div className="mt-0.5 text-xs text-gray-500">
                {Math.round((pending.duration_minutes / 60) * 10) / 10} ชม. ·{" "}
                {pending.planned_student_count ?? 1} คน ·{" "}
                {pending.delivery_mode === "online" ? "ออนไลน์" : "ออนไซต์"}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="ปิด"
            >
              ✕
            </button>
          </header>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
            {loading && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                ⏳ AI กำลังหาสล็อตให้... (รวบ rooms × tutors × time + เช็ค conflict)
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="mb-3 text-xs text-gray-500">{message}</div>
                {recommendations.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="font-semibold">ไม่พบสล็อตที่จัดได้</div>
                    {alternatives.length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-800">
                        {alternatives.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {recommendations.map((r) => {
                      const room = rooms.find((x) => x.id === r.roomId);
                      const tutor = tutors.find((x) => x.id === r.tutorId);
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() =>
                              onPick({
                                dayOfWeek: r.dayOfWeek,
                                startTime: r.startTime,
                                endTime: r.endTime,
                                roomId: r.roomId,
                                tutorId: r.tutorId,
                              })
                            }
                            className="group w-full rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand-400 hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {DOW_LABEL[r.dayOfWeek]} · {r.startTime}–{r.endTime}
                                </div>
                                <div className="mt-1 text-sm text-gray-600">
                                  ครู {tutor?.name ?? "—"}
                                  {room
                                    ? ` · ห้อง ${room.name} (จุ ${room.capacity})`
                                    : " · ออนไลน์"}
                                </div>
                              </div>
                              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                score {r.score}
                              </div>
                            </div>
                            {r.reasons.length > 0 && (
                              <ul className="mt-3 flex flex-wrap gap-1.5">
                                {r.reasons.map((reason, i) => (
                                  <li
                                    key={i}
                                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                                  >
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {r.warnings.length > 0 && (
                              <ul className="mt-2 flex flex-wrap gap-1.5">
                                {r.warnings.map((w, i) => (
                                  <li
                                    key={i}
                                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800"
                                  >
                                    ⚠ {w}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-3 text-right text-xs font-semibold text-brand-600 group-hover:underline">
                              ใช้สล็อตนี้ →
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-[11px] text-gray-500">
            <span>
              AI แนะนำเท่านั้น · ไม่บันทึก DB จนกว่าจะ confirm ผ่าน
              schedulePendingToEvent
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              ปิด
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}

/** Light-weight Thai-title → subject key guess for required skill. */
function guessSubjectFromTitle(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("ฟิสิกส์")) return "physics";
  if (t.includes("เคมี")) return "chem";
  if (t.includes("ชีวะ") || t.includes("ชีววิทยา")) return "bio";
  if (t.includes("คณิต")) return "math";
  if (t.includes("อังกฤษ")) return "english";
  if (t.includes("วิทย์")) return "science";
  return null;
}
