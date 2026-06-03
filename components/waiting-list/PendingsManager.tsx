"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Branch,
  Course,
  PendingBooking,
  TutorProfile,
} from "@/lib/supabase/types";
import { PendingFormDrawer } from "./PendingFormDrawer";
import { deletePending } from "@/app/admin/waiting-list/actions";
import { EditPinField } from "@/components/edit-mode/EditPinField";
import { useEditPin } from "@/components/edit-mode/useEditMode";

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
};

export function PendingsManager({ branches, courses, tutors, pendings }: Props) {
  const router = useRouter();
  const { isUnlocked, ready } = useEditPin();
  const [drawer, setDrawer] = useState<
    { mode: "create" } | { mode: "edit"; pending: PendingBooking } | null
  >(null);

  const tutorById = new Map(tutors.map((t) => [t.id, t]));

  // Locked viewers see no deals and no edit affordances — same posture as
  // the Waiting List panel inside the schedule grid.
  if (!ready) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-400">
        ⏳ กำลังโหลด...
      </div>
    );
  }
  if (!isUnlocked) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-6 py-12 text-center">
        <div className="text-3xl">🔒</div>
        <div className="mt-3 text-base font-semibold text-amber-900">
          ดีลของลูกค้าถูกซ่อนไว้
        </div>
        <p className="mt-2 text-sm text-amber-800">
          กดปุ่ม <span className="font-semibold">"🔒 โหมดดูอย่างเดียว"</span>{" "}
          มุมซ้ายล่างเพื่อใส่ PIN
        </p>
      </div>
    );
  }

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
    </>
  );
}
