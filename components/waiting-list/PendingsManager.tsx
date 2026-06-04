"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Branch,
  Course,
  PendingBooking,
  Room,
  TutorProfile,
} from "@/lib/supabase/types";
import { PendingFormDrawer } from "./PendingFormDrawer";
import { deletePending } from "@/app/admin/waiting-list/actions";
import { EditPinField } from "@/components/edit-mode/EditPinField";
import { AIScheduleModal } from "@/components/agents/AIScheduleModal";
import { ScheduleFromPendingModal } from "@/components/schedule-grid/ScheduleFromPendingModal";
import type {
  Room as AgentRoom,
  ScheduleEvent as AgentEvent,
  Tutor as AgentTutor,
} from "@/lib/agents/types";

const MODE_LABEL: Record<string, string> = {
  onsite: "ออนไซต์",
  online: "ออนไลน์",
  hybrid: "ไฮบริด",
};

type Props = {
  branches: Branch[];
  courses: Course[];
  tutors: TutorProfile[];
  pendings: PendingBooking[];
  rooms: Room[];
};

interface AgentSnapshot {
  rooms: AgentRoom[];
  tutors: AgentTutor[];
  events: AgentEvent[];
}

export function PendingsManager({
  branches,
  courses,
  tutors,
  pendings,
  rooms,
}: Props) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<
    { mode: "create" } | { mode: "edit"; pending: PendingBooking } | null
  >(null);

  // AI flow state
  const [aiPending, setAiPending] = useState<PendingBooking | null>(null);
  const [snapshot, setSnapshot] = useState<AgentSnapshot | null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [snapErr, setSnapErr] = useState<string | null>(null);

  // After AI pick — opens the existing ScheduleFromPendingModal
  const [scheduleTarget, setScheduleTarget] = useState<
    | {
        pending: PendingBooking;
        dayOfWeek: number;
        startTime: string;
        roomId: string | null;
      }
    | null
  >(null);

  const tutorById = new Map(tutors.map((t) => [t.id, t]));

  async function openAI(pending: PendingBooking) {
    setSnapErr(null);
    if (!snapshot) {
      setLoadingSnap(true);
      try {
        const res = await fetch("/api/agents/snapshot");
        if (!res.ok) throw new Error(`snapshot ${res.status}`);
        const data = (await res.json()) as AgentSnapshot;
        setSnapshot(data);
      } catch (e) {
        setSnapErr((e as Error).message);
        setLoadingSnap(false);
        return;
      }
      setLoadingSnap(false);
    }
    setAiPending(pending);
  }

  // Locked-mode protection now lives on the page via <AdminGuard>; this
  // component assumes the caller has already gated visibility.

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="text-sm text-gray-500">
          ดีลรอจัดตาราง <span className="font-semibold">{pendings.length}</span> รายการ ·{" "}
          ลากการ์ดไปวางใน{" "}
          <Link
            href="/admin/room-schedule"
            className="text-brand-600 underline hover:text-brand-700"
          >
            ตารางห้องเรียน
          </Link>{" "}
          เพื่อกำหนดเวลา/ห้อง
        </div>

        <button
          type="button"
          onClick={() => setDrawer({ mode: "create" })}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          + เพิ่มดีลใหม่
        </button>
      </header>

      {pendings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          ยังไม่มีดีลรอจัดตาราง — กดปุ่ม "+ เพิ่มดีลใหม่" เพื่อเริ่มต้น
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {pendings.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow"
              style={
                p.color_hex
                  ? { borderLeft: `4px solid ${p.color_hex}` }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] font-semibold text-brand-600">
                    {p.class_code}
                  </div>
                  <div className="mt-0.5 truncate text-base font-semibold text-gray-900">
                    {p.title_th}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {Math.round(p.duration_minutes / 60 * 10) / 10} ชม. ·{" "}
                    {MODE_LABEL[p.delivery_mode] ?? p.delivery_mode}
                    {p.planned_student_count
                      ? ` · ${p.planned_student_count} คน`
                      : ""}
                  </div>
                  {p.tutor_profile_id && (
                    <div className="mt-1 text-xs text-gray-600">
                      ครู:{" "}
                      <span className="font-medium">
                        {tutorById.get(p.tutor_profile_id)?.display_name_th ?? "—"}
                      </span>
                    </div>
                  )}
                  {p.student_names && p.student_names.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.student_names.slice(0, 6).map((n, i) => (
                        <span
                          key={`${n}-${i}`}
                          className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                        >
                          {n}
                        </span>
                      ))}
                      {p.student_names.length > 6 && (
                        <span className="text-[11px] text-gray-400">
                          +{p.student_names.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                  {p.notes && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                      {p.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openAI(p)}
                  disabled={loadingSnap}
                  className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  title="ให้ AI เสนอสล็อตที่จัดได้"
                >
                  {loadingSnap ? "⏳" : "🤖 จัดให้ AI"}
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer({ mode: "edit", pending: p })}
                  className="rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  แก้ไข
                </button>
                <form
                  action={async (fd) => {
                    if (!confirm(`ลบ "${p.title_th}" ออกจากคลังรอจัดตาราง?`)) {
                      return;
                    }
                    await deletePending(fd);
                    router.refresh();
                  }}
                >
                  <EditPinField />
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    ลบ
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PendingFormDrawer
        open={drawer !== null}
        mode={drawer?.mode ?? "create"}
        branches={branches}
        courses={courses}
        tutors={tutors}
        pending={drawer?.mode === "edit" ? drawer.pending : null}
        onClose={() => setDrawer(null)}
        onSaved={() => {
          setDrawer(null);
          router.refresh();
        }}
      />

      {snapErr && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-lg">
          โหลด snapshot ไม่สำเร็จ: {snapErr}
          <button
            type="button"
            onClick={() => setSnapErr(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {aiPending && snapshot && (
        <AIScheduleModal
          pending={aiPending}
          rooms={snapshot.rooms}
          tutors={snapshot.tutors}
          events={snapshot.events}
          onClose={() => setAiPending(null)}
          onPick={(slot) => {
            setAiPending(null);
            setScheduleTarget({
              pending: aiPending,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime + ":00",
              roomId: slot.roomId,
            });
          }}
        />
      )}

      <ScheduleFromPendingModal
        open={scheduleTarget !== null}
        pending={scheduleTarget?.pending ?? null}
        rooms={rooms}
        initialRoomId={scheduleTarget?.roomId ?? null}
        initialDayOfWeek={(scheduleTarget?.dayOfWeek ?? 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7}
        initialStartTime={scheduleTarget?.startTime ?? "17:30:00"}
        onClose={() => {
          setScheduleTarget(null);
          router.refresh();
        }}
      />
    </>
  );
}
