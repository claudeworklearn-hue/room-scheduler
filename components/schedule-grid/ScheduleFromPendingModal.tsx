"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DayOfWeek, PendingBooking, Room } from "@/lib/supabase/types";
import { schedulePendingToEvent } from "@/app/admin/waiting-list/actions";
import { addMinutesToTime, shortHHMM } from "@/lib/time/grid";
import { WEEK_DAYS_TH_LONG } from "@/lib/time/week";
import { useEditPin } from "@/components/edit-mode/useEditMode";

const MODE_LABEL: Record<string, string> = {
  onsite: "ออนไซต์",
  online: "ออนไลน์",
  hybrid: "ไฮบริด",
};

type Props = {
  open: boolean;
  pending: PendingBooking | null;
  rooms: Room[];
  initialRoomId: string | null;
  initialDayOfWeek: DayOfWeek;
  initialStartTime: string; // "HH:MM:SS"
  onClose: () => void;
};

export function ScheduleFromPendingModal({
  open,
  pending,
  rooms,
  initialRoomId,
  initialDayOfWeek,
  initialStartTime,
  onClose,
}: Props) {
  const router = useRouter();
  const { pin } = useEditPin();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const [roomId, setRoomId] = useState<string | null>(initialRoomId);
  const [dow, setDow] = useState<DayOfWeek>(initialDayOfWeek);
  const [startTime, setStartTime] = useState(shortHHMM(initialStartTime));
  const [durationMin, setDurationMin] = useState<number>(
    pending?.duration_minutes ?? 60,
  );
  const [title, setTitle] = useState<string>(pending?.title_th ?? "");

  useEffect(() => {
    if (!open || !pending) return;
    setRoomId(initialRoomId);
    setDow(initialDayOfWeek);
    setStartTime(shortHHMM(initialStartTime));
    setDurationMin(pending.duration_minutes);
    setTitle(pending.title_th);
    setError(null);
    setConflict(false);
  }, [open, pending, initialRoomId, initialDayOfWeek, initialStartTime]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !pending) return null;

  const isOnline = pending.delivery_mode === "online";
  const endTime = shortHHMM(addMinutesToTime(`${startTime}:00`, durationMin));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setError(null);
    setConflict(false);

    if (!isOnline && !roomId) {
      setError("คลาส onsite/hybrid ต้องเลือกห้อง");
      return;
    }

    startTransition(async () => {
      const res = await schedulePendingToEvent({
        pending_id: pending.id,
        room_id: isOnline ? null : roomId,
        day_of_week: dow,
        start_time: `${startTime}:00`,
        end_time: addMinutesToTime(`${startTime}:00`, durationMin),
        override_title: title || undefined,
        pin,
      });
      if (!res.ok) {
        setError(res.error || "บันทึกไม่สำเร็จ");
        setConflict(!!res.conflict);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <header className="border-b border-gray-100 px-6 py-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            จัดตาราง — ยืนยันรายละเอียด
          </div>
          <h2 className="mt-1 text-xl font-bold text-gray-900">
            {pending.title_th}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="rounded bg-brand-100 px-1.5 py-0.5 font-mono font-semibold text-brand-700">
              {pending.class_code}
            </span>
            <span className="text-gray-500">
              · {MODE_LABEL[pending.delivery_mode]} ·{" "}
              {Math.round((pending.duration_minutes / 60) * 10) / 10} ชม.
              {pending.planned_student_count
                ? ` · ${pending.planned_student_count} คน`
                : ""}
            </span>
          </div>
          {pending.student_names && pending.student_names.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-[11px] text-gray-400">นักเรียน:</span>
              {pending.student_names.map((n, i) => (
                <span
                  key={`${n}-${i}`}
                  className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </header>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          {error && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                conflict
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-amber-300 bg-amber-50 text-amber-700"
              }`}
            >
              {error}
              {conflict && (
                <div className="mt-1 text-xs">
                  เปลี่ยนวัน/เวลาหรือห้องแล้วลองอีกครั้ง
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              ชื่อคลาส
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              วันในสัปดาห์ <span className="text-red-500">*</span>
            </label>
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
              {([1, 2, 3, 4, 5, 6, 7] as DayOfWeek[]).map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDow(d)}
                  className={[
                    "rounded-md px-3 py-1 text-xs font-medium transition",
                    dow === d
                      ? "bg-brand-500 text-white"
                      : "text-gray-600 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {WEEK_DAYS_TH_LONG[d - 1]}
                </button>
              ))}
            </div>
          </div>

          {!isOnline && (
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                ห้อง <span className="text-red-500">*</span>
              </label>
              <select
                value={roomId ?? ""}
                onChange={(e) => setRoomId(e.target.value || null)}
                className="form-control"
              >
                <option value="">— เลือกห้อง —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.building ? `${r.building} · ` : ""}
                    {r.code} — {r.name_th} (จุ {r.capacity})
                  </option>
                ))}
              </select>
              {pending.planned_student_count != null &&
                roomId &&
                (() => {
                  const room = rooms.find((r) => r.id === roomId);
                  if (room && pending.planned_student_count! > room.capacity) {
                    return (
                      <p className="mt-1 text-xs text-amber-700">
                        ⚠ จำนวนนักเรียน ({pending.planned_student_count}) เกินความจุห้อง (
                        {room.capacity})
                      </p>
                    );
                  }
                  return null;
                })()}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                เวลาเริ่ม <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                step={1800}
                className="form-control"
                required
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                ระยะเวลา (นาที)
              </label>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="form-control"
              >
                {[30, 60, 90, 120, 150, 180, 210, 240].map((d) => (
                  <option key={d} value={d}>
                    {d} นาที
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            สรุป: ทุกวัน{WEEK_DAYS_TH_LONG[dow - 1]} · {startTime}–{endTime} น.
            ({durationMin} นาที) — repeat ทุกสัปดาห์
          </div>

          <footer className="flex justify-end gap-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isPending ? "กำลังบันทึก..." : "บันทึกลงตาราง"}
            </button>
          </footer>
        </form>

        <style jsx global>{`
          .form-control {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid #e5e7eb;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            background: white;
          }
          .form-control:focus {
            outline: none;
            border-color: #f3c01c;
            box-shadow: 0 0 0 2px #fde18a;
          }
        `}</style>
      </div>
    </>
  );
}
