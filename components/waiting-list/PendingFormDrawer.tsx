"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type {
  Branch,
  Course,
  PendingBooking,
  TutorProfile,
} from "@/lib/supabase/types";
import {
  createPending,
  updatePending,
  type PendingFormState,
} from "@/app/admin/waiting-list/actions";
import { StudentNamesInput } from "./StudentNamesInput";

const INITIAL: PendingFormState = {};

const DELIVERY_OPTIONS: { value: string; label: string }[] = [
  { value: "onsite", label: "ออนไซต์ (ต้องการห้อง)" },
  { value: "online", label: "ออนไลน์ (ไม่ใช้ห้อง)" },
  { value: "hybrid", label: "ไฮบริด (ใช้ห้อง)" },
];

const DURATION_OPTIONS = [60, 90, 120, 150, 180, 240];

const PREFIX_OPTIONS = [
  { value: "PV", label: "PV — Private (กลุ่มเล็ก/ตัวต่อตัว)" },
  { value: "GR", label: "GR — Group (กลุ่มใหญ่)" },
  { value: "CM", label: "CM — Camp (ค่าย/intensive)" },
  { value: "IN", label: "IN — Intensive (เร่งรัด)" },
];

const GRADE_OPTIONS = [
  { value: "P1", label: "ป.1" }, { value: "P2", label: "ป.2" },
  { value: "P3", label: "ป.3" }, { value: "P4", label: "ป.4" },
  { value: "P5", label: "ป.5" }, { value: "P6", label: "ป.6" },
  { value: "M1", label: "ม.1" }, { value: "M2", label: "ม.2" },
  { value: "M3", label: "ม.3" }, { value: "M4", label: "ม.4" },
  { value: "M5", label: "ม.5" }, { value: "M6", label: "ม.6" },
  { value: "ETC", label: "อื่น ๆ (ETC)" },
];

type Props = {
  open: boolean;
  mode: "create" | "edit";
  branches: Branch[];
  courses: Course[];
  tutors: TutorProfile[];
  pending?: PendingBooking | null;
  onClose: () => void;
  onSaved: () => void;
};

export function PendingFormDrawer({
  open,
  mode,
  branches,
  courses,
  tutors,
  pending,
  onClose,
  onSaved,
}: Props) {
  const action = mode === "create" ? createPending : updatePending;
  const [state, formAction] = useFormState(action, INITIAL);

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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
              {mode === "create" ? "เพิ่มรายการรอจัดตาราง" : "แก้ไขรายการ"}
            </div>
            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {mode === "create" ? "ดีลใหม่" : pending?.title_th}
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
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {mode === "edit" && pending && (
              <input type="hidden" name="id" value={pending.id} />
            )}

            {state.error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </div>
            )}

            {mode === "edit" && pending?.class_code && (
              <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-xs">
                <div className="text-gray-500">รหัสคลาส</div>
                <div className="mt-0.5 font-mono text-base font-semibold text-brand-700">
                  {pending.class_code}
                </div>
                <div className="mt-1 text-[11px] text-gray-400">
                  (ระบบสร้างให้อัตโนมัติ ไม่สามารถแก้ได้ — ลบและสร้างใหม่ถ้าต้องการเปลี่ยน)
                </div>
              </div>
            )}

            <Field label="สาขา" required error={state.fieldErrors?.branch_id}>
              <select
                name="branch_id"
                defaultValue={pending?.branch_id ?? branches[0]?.id ?? ""}
                className="form-control"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_th}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="ประเภทคลาส"
                required
                error={state.fieldErrors?.code_prefix}
                hint={mode === "edit" ? "ล็อกหลังสร้างแล้ว" : undefined}
              >
                {mode === "edit" && pending && (
                  <input type="hidden" name="code_prefix" value={pending.code_prefix} />
                )}
                <select
                  name={mode === "edit" ? "_code_prefix_display" : "code_prefix"}
                  defaultValue={pending?.code_prefix ?? "PV"}
                  disabled={mode === "edit"}
                  className="form-control disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {PREFIX_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="ระดับชั้น"
                required
                error={state.fieldErrors?.grade_level}
                hint={mode === "edit" ? "ล็อกหลังสร้างแล้ว" : undefined}
              >
                {mode === "edit" && pending && (
                  <input type="hidden" name="grade_level" value={pending.grade_level} />
                )}
                <select
                  name={mode === "edit" ? "_grade_level_display" : "grade_level"}
                  defaultValue={pending?.grade_level ?? "M4"}
                  disabled={mode === "edit"}
                  className="form-control disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {GRADE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label="ชื่อคลาส (ที่จะใช้ใน grid)"
              required
              error={state.fieldErrors?.title_th}
              hint="เช่น 'ฟิสิกส์ ม.5 (รุ่นพิเศษ)'"
            >
              <input
                name="title_th"
                type="text"
                defaultValue={pending?.title_th ?? ""}
                placeholder="ฟิสิกส์ ม.5"
                className="form-control"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="ระยะเวลา (นาที)"
                required
                error={state.fieldErrors?.duration_minutes}
              >
                <select
                  name="duration_minutes"
                  defaultValue={pending?.duration_minutes ?? 120}
                  className="form-control"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} นาที ({(d / 60).toFixed(d % 60 ? 1 : 0)} ชม.)
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="จำนวนนักเรียน"
                error={state.fieldErrors?.planned_student_count}
              >
                <input
                  name="planned_student_count"
                  type="number"
                  min={1}
                  defaultValue={pending?.planned_student_count ?? ""}
                  placeholder="—"
                  className="form-control"
                />
              </Field>
            </div>

            <Field
              label="รูปแบบการสอน"
              required
              error={state.fieldErrors?.delivery_mode}
            >
              <select
                name="delivery_mode"
                defaultValue={pending?.delivery_mode ?? "onsite"}
                className="form-control"
              >
                {DELIVERY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="ติวเตอร์ (optional)" error={state.fieldErrors?.tutor_profile_id}>
              <select
                name="tutor_profile_id"
                defaultValue={pending?.tutor_profile_id ?? ""}
                className="form-control"
              >
                <option value="">— ยังไม่ระบุ —</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name_th} ({t.short_code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="คอร์ส (optional)" error={state.fieldErrors?.course_id}>
              <select
                name="course_id"
                defaultValue={pending?.course_id ?? ""}
                className="form-control"
              >
                <option value="">— ไม่ระบุ —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title_th}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="สี (hex) — optional"
              error={state.fieldErrors?.color_hex}
              hint="เช่น #FFB84D — ถ้าเว้นว่าง จะใช้สีของคอร์ส/ติวเตอร์"
            >
              <input
                name="color_hex"
                type="text"
                defaultValue={pending?.color_hex ?? ""}
                placeholder="#FFB84D"
                className="form-control"
              />
            </Field>

            <Field
              label="ชื่อนักเรียน (กลุ่ม Private)"
              hint="ใส่ได้หลายคน — เผื่อทบทวนตอนเรียก ผปค."
            >
              <StudentNamesInput
                name="student_names"
                defaultNames={pending?.student_names ?? []}
                placeholder="น้องเอ, น้องบี, ..."
              />
            </Field>

            <Field label="หมายเหตุ (เก็บประเด็นจากการดีล)">
              <textarea
                name="notes"
                rows={3}
                defaultValue={pending?.notes ?? ""}
                placeholder="เช่น ดีลกับผู้ปกครองวันที่ ..."
                className="form-control"
              />
            </Field>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <SubmitBtn mode={mode} />
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
  error,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
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
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SubmitBtn({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
    >
      {pending ? "กำลังบันทึก..." : mode === "create" ? "เพิ่มดีล" : "บันทึก"}
    </button>
  );
}
