"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Branch, TutorProfile } from "@/lib/supabase/types";
import {
  createTutor,
  updateTutor,
  type TutorFormState,
} from "@/app/admin/tutors/actions";
import { EditPinField } from "@/components/edit-mode/EditPinField";
import { SUBJECT_LIST } from "@/lib/subject-colors";

const INITIAL: TutorFormState = {};

const COLOR_PRESETS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#A855F7", "#EC4899",
  "#64748B", "#0F172A",
];

type Props = {
  open: boolean;
  mode: "create" | "edit";
  branches: Branch[];
  tutor?: TutorProfile | null;
  onClose: () => void;
  onSaved: () => void;
};

export function TutorFormDrawer({
  open,
  mode,
  branches,
  tutor,
  onClose,
  onSaved,
}: Props) {
  const action = mode === "create" ? createTutor : updateTutor;
  const [state, formAction] = useFormState(action, INITIAL);
  const [subjects, setSubjects] = useState<string[]>(tutor?.subjects ?? []);

  function toggleSubject(key: string) {
    setSubjects((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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
              {mode === "create" ? "เพิ่มติวเตอร์" : "แก้ไขติวเตอร์"}
            </div>
            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {mode === "create" ? "ติวเตอร์ใหม่" : tutor?.display_name_th}
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
          <EditPinField />
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {mode === "edit" && tutor && (
              <input type="hidden" name="id" value={tutor.id} />
            )}

            {state.error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <Field
              label="ชื่อ (ไทย)"
              error={state.fieldErrors?.display_name_th}
              required
              hint="เช่น ครูเกรท, พี่ปอง, ครูนก"
            >
              <input
                name="display_name_th"
                type="text"
                defaultValue={tutor?.display_name_th ?? ""}
                placeholder="ครูเกรท"
                className="form-control"
              />
            </Field>

            <Field
              label="ชื่อ (English) — optional"
              error={state.fieldErrors?.display_name_en}
            >
              <input
                name="display_name_en"
                type="text"
                defaultValue={tutor?.display_name_en ?? ""}
                placeholder="Kru Great"
                className="form-control"
              />
            </Field>

            <Field
              label="Short code"
              error={state.fieldErrors?.short_code}
              required
              hint="ตัวย่อ ≤ 8 ตัวอักษร ใช้ใน grid (ต้องไม่ซ้ำ)"
            >
              <input
                name="short_code"
                type="text"
                maxLength={8}
                defaultValue={tutor?.short_code ?? ""}
                placeholder="GRT"
                className="form-control uppercase"
              />
            </Field>

            <Field
              label="สี (hex) — optional"
              error={state.fieldErrors?.color_hex}
              hint="ตอนนี้ระบบใช้สีตามวิชาก่อน — สีนี้ใช้เป็น fallback ถ้า detect วิชาไม่ออก"
            >
              <div className="flex items-center gap-2">
                <input
                  name="color_hex"
                  type="text"
                  defaultValue={tutor?.color_hex ?? ""}
                  placeholder="#A855F7"
                  className="form-control flex-1"
                  pattern="#[0-9A-Fa-f]{6}"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={(e) => {
                      const input = (e.currentTarget.closest("div")
                        ?.previousElementSibling as HTMLDivElement)?.querySelector(
                        "input",
                      ) as HTMLInputElement | null;
                      if (input) input.value = c;
                    }}
                    className="h-6 w-6 rounded-full border border-gray-300 transition hover:scale-110"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </Field>

            <Field
              label="วิชาที่รับสอน"
              hint="เลือกได้มากกว่า 1 วิชา — ใช้กรอง/แนะนำครูในระบบทีหลัง"
            >
              <input
                type="hidden"
                name="subjects"
                value={JSON.stringify(subjects)}
              />
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_LIST.map((s) => {
                  const on = subjects.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSubject(s.key)}
                      className="rounded-full border px-3 py-1 text-xs font-semibold transition"
                      style={
                        on
                          ? {
                              background: s.color,
                              borderColor: s.color,
                              color: "white",
                            }
                          : {
                              borderColor: "#E5E7EB",
                              color: "#6B7280",
                              background: "white",
                            }
                      }
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="สาขา — optional" error={state.fieldErrors?.branch_id}>
              <select
                name="branch_id"
                defaultValue={tutor?.branch_id ?? ""}
                className="form-control"
              >
                <option value="">— ไม่ระบุ —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_th}
                  </option>
                ))}
              </select>
            </Field>

            <div className="mt-2 flex items-center gap-2">
              <input
                id="active"
                name="active"
                type="checkbox"
                defaultChecked={tutor?.active ?? true}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
              />
              <label htmlFor="active" className="text-sm text-gray-700">
                เปิดใช้งานติวเตอร์คนนี้
              </label>
            </div>
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
      </aside>

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
      {pending
        ? "กำลังบันทึก..."
        : mode === "create"
          ? "สร้างติวเตอร์"
          : "บันทึก"}
    </button>
  );
}
