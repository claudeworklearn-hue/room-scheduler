"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Branch, Room } from "@/lib/supabase/types";
import {
  createRoom,
  updateRoom,
  type RoomFormState,
} from "@/app/admin/rooms/actions";
import { EditPinField } from "@/components/edit-mode/EditPinField";

const ROOM_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "classroom", label: "ห้องเรียน (classroom)" },
  { value: "lab", label: "แล็บ (lab)" },
  { value: "meeting", label: "ห้องประชุม (meeting)" },
  { value: "studio", label: "สตูดิโอ (studio)" },
  { value: "other", label: "อื่น ๆ (other)" },
];

const INITIAL: RoomFormState = {};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  branches: Branch[];
  room?: Room | null;
  onClose: () => void;
  onSaved: () => void;
};

export function RoomFormDrawer({ open, mode, branches, room, onClose, onSaved }: Props) {
  const action = mode === "create" ? createRoom : updateRoom;
  const [state, formAction] = useFormState(action, INITIAL);

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
              {mode === "create" ? "สร้างห้องใหม่" : "แก้ไขห้อง"}
            </div>
            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {mode === "create" ? "เพิ่มห้องในระบบ" : room?.name_th}
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
            {mode === "edit" && room && (
              <input type="hidden" name="id" value={room.id} />
            )}

            {state.error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <Field label="สาขา" error={state.fieldErrors?.branch_id} required>
              <select
                name="branch_id"
                defaultValue={room?.branch_id ?? branches[0]?.id ?? ""}
                className="form-control"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_th}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="ตึก/อาคาร"
              error={state.fieldErrors?.building}
              hint="ใช้จัดกลุ่มห้องใน grid เช่น 'ตึกหลัก', 'ตึก med' — เว้นว่างได้ถ้าไม่จัดกลุ่ม"
            >
              <input
                name="building"
                type="text"
                defaultValue={room?.building ?? ""}
                placeholder="ตึกหลัก"
                className="form-control"
                list="building-suggestions"
              />
              <datalist id="building-suggestions">
                <option value="ตึกหลัก" />
                <option value="ตึก med" />
              </datalist>
            </Field>

            <Field label="รหัสห้อง" error={state.fieldErrors?.code} required hint="เช่น A, D, OL, หน้า">
              <input
                name="code"
                type="text"
                defaultValue={room?.code ?? ""}
                placeholder="A24"
                className="form-control"
              />
            </Field>

            <Field label="ชื่อห้อง (ไทย)" error={state.fieldErrors?.name_th} required>
              <input
                name="name_th"
                type="text"
                defaultValue={room?.name_th ?? ""}
                placeholder="ห้อง A24"
                className="form-control"
              />
            </Field>

            <Field label="ชื่อห้อง (English) — optional" error={state.fieldErrors?.name_en}>
              <input
                name="name_en"
                type="text"
                defaultValue={room?.name_en ?? ""}
                placeholder="Room A24"
                className="form-control"
              />
            </Field>

            <Field label="ความจุ (คน)" error={state.fieldErrors?.capacity} required>
              <input
                name="capacity"
                type="number"
                min={1}
                max={500}
                defaultValue={room?.capacity ?? 20}
                className="form-control"
              />
            </Field>

            <Field label="ประเภทห้อง" error={state.fieldErrors?.room_type} required>
              <select
                name="room_type"
                defaultValue={room?.room_type ?? "classroom"}
                className="form-control"
              >
                {ROOM_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="หมายเหตุสถานที่ (เช่น ชั้น 2, ตึก B)"
              error={state.fieldErrors?.location_note}
            >
              <input
                name="location_note"
                type="text"
                defaultValue={room?.location_note ?? ""}
                placeholder=""
                className="form-control"
              />
            </Field>

            <Field
              label="ลำดับการเรียง (น้อย → มาก = อยู่บนสุด)"
              error={state.fieldErrors?.sort_order}
            >
              <input
                name="sort_order"
                type="number"
                min={0}
                defaultValue={room?.sort_order ?? 0}
                className="form-control"
              />
            </Field>

            <div className="mt-2 flex items-center gap-2">
              <input
                id="active"
                name="active"
                type="checkbox"
                defaultChecked={room?.active ?? true}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
              />
              <label htmlFor="active" className="text-sm text-gray-700">
                เปิดใช้งานห้องนี้
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

      {/* form-control style fallback (รวมไว้ตรงนี้เพื่อไม่ต้องเพิ่มไฟล์ css) */}
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
          ? "สร้างห้อง"
          : "บันทึกการแก้ไข"}
    </button>
  );
}
