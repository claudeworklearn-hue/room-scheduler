"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type {
  Course,
  DayOfWeek,
  Room,
  TutorProfile,
} from "@/lib/supabase/types";
import type { EventWithRelations } from "./EventBlock";
import { shortHHMM } from "@/lib/time/grid";
import { WEEK_DAYS_TH_LONG } from "@/lib/time/week";
import {
  deleteEvent,
  updateEvent,
  type EventUpdateState,
} from "@/app/admin/room-schedule/actions";

const INITIAL: EventUpdateState = {};

const MODE_OPTIONS = [
  { value: "onsite", label: "ออนไซต์ (ต้องการห้อง)" },
  { value: "online", label: "ออนไลน์ (ไม่ใช้ห้อง)" },
  { value: "hybrid", label: "ไฮบริด (ใช้ห้อง)" },
];

const STATUS_OPTIONS = [
  { value: "scheduled", label: "ยืนยันแล้ว" },
  { value: "draft", label: "ฉบับร่าง" },
  { value: "cancelled", label: "ยกเลิก" },
];

type Props = {
  event: EventWithRelations | null;
  rooms: Room[];
  tutors: TutorProfile[];
  courses: Course[];
  onClose: () => void;
};

export function EventDrawer({ event, rooms, tutors, courses, onClose }: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateEvent, INITIAL);
  const [isDeleting, setIsDeleting] = useState(false);

  // local form state — sync เมื่อ event เปลี่ยน
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [dow, setDow] = useState<DayOfWeek>(1);
  const [startTime, setStartTime] = useState("17:30");
  const [endTime, setEndTime] = useState("19:30");
  const [mode, setMode] = useState<string>("onsite");
  const [roomId, setRoomId] = useState<string>("");
  const [tutorId, setTutorId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [studentCount, setStudentCount] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!event) return;
    setTitle(event.title_th);
    setStatus(event.status);
    setDow(event.day_of_week);
    setStartTime(shortHHMM(event.start_time));
    setEndTime(shortHHMM(event.end_time));
    setMode(event.delivery_mode ?? "online");
    setRoomId(event.room_id ?? "");
    setTutorId(event.tutor_profile_id ?? "");
    setCourseId(event.course_id ?? "");
    setStudentCount(
      event.planned_student_count != null ? String(event.planned_student_count) : "",
    );
    setNotes(event.notes ?? "");
  }, [event]);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [state.ok, router, onClose]);

  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [event, onClose]);

  if (!event) return null;

  const isOnline = mode === "online";

  async function handleDelete() {
    if (!event) return;
    if (
      !confirm(`ลบคลาส "${event.title_th}" ออกจากตาราง? (ลบถาวร)`)
    ) {
      return;
    }
    setIsDeleting(true);
    const fd = new FormData();
    fd.append("id", event.id);
    await deleteEvent(fd);
    setIsDeleting(false);
    router.refresh();
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {event.event_type === "room_block" ? "ปิดห้อง" : "คลาสเรียน"}
              {" · แก้ไข"}
            </div>
            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {event.title_th}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
          >
            ✕
          </button>
        </header>

        <form action={formAction} className="flex flex-1 flex-col overflow-hidden">
          <input type="hidden" name="id" value={event.id} />

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {state.error && (
              <div
                className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                  state.conflict
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-amber-300 bg-amber-50 text-amber-700"
                }`}
              >
                {state.error}
              </div>
            )}

            <Field label="ชื่อคลาส" required>
              <input
                name="title_th"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-control"
                required
              />
            </Field>

            <Field label="สถานะ" required>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-control"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="วันในสัปดาห์" required>
              <input type="hidden" name="day_of_week" value={dow} />
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
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="เวลาเริ่ม" required>
                <input
                  name="start_time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  step={1800}
                  className="form-control"
                  required
                />
              </Field>
              <Field label="เวลาจบ" required>
                <input
                  name="end_time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  step={1800}
                  className="form-control"
                  required
                />
              </Field>
            </div>

            <Field label="รูปแบบการสอน">
              <select
                name="delivery_mode"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  if (e.target.value === "online") setRoomId("");
                }}
                className="form-control"
              >
                {MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="ห้อง"
              hint={isOnline ? "ออนไลน์ → ไม่ต้องเลือกห้อง" : undefined}
            >
              <select
                name="room_id"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={isOnline}
                className="form-control disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">— ไม่ระบุห้อง —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.building ? `${r.building} · ` : ""}
                    {r.code} — {r.name_th} (จุ {r.capacity})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="ติวเตอร์">
              <select
                name="tutor_profile_id"
                value={tutorId}
                onChange={(e) => setTutorId(e.target.value)}
                className="form-control"
              >
                <option value="">— ไม่ระบุครู —</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name_th} ({t.short_code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="คอร์ส (optional)">
              <select
                name="course_id"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="form-control"
              >
                <option value="">— ไม่ระบุคอร์ส —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title_th}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="จำนวนนักเรียน">
              <input
                name="planned_student_count"
                type="number"
                min={1}
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
                placeholder="—"
                className="form-control"
              />
            </Field>

            <Field label="หมายเหตุ">
              <textarea
                name="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-control"
              />
            </Field>

            <div className="mt-4 text-xs text-gray-400">
              ID: <code>{event.id}</code>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "กำลังลบ..." : "🗑 ลบคลาส"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                ปิด
              </button>
              <SubmitBtn />
            </div>
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
      </aside>
    </>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
    >
      {pending ? "กำลังบันทึก..." : "💾 บันทึก"}
    </button>
  );
}
