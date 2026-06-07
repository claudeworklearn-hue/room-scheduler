"use client";

import { useState, useTransition } from "react";
import type { TutorProfile } from "@/lib/supabase/types";
import { toggleTutorClosedDay } from "@/app/admin/tutors/actions";
import { EditPinField } from "@/components/edit-mode/EditPinField";
import { useEditPin } from "@/components/edit-mode/useEditMode";

const LABELS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

/**
 * Inline 7-day toggle row used inside the deal-planner tutor card so
 * admins can mark a tutor as "ปิดรับคอร์สใหม่" for a given weekday
 * without opening the full edit drawer.
 *
 * Falls back to a read-only chip strip when the visitor isn't in edit
 * mode — anonymous viewers still see WHICH days the tutor is closed.
 */
export function TutorClosedDaysEditor({ tutor }: { tutor: TutorProfile }) {
  const { isUnlocked } = useEditPin();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<number[] | null>(null);

  const days = optimistic ?? tutor.closed_days_for_new ?? [];

  function onToggle(day: number) {
    if (!isUnlocked) return;
    const next = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort((a, b) => a - b);
    setOptimistic(next);
    const fd = new FormData();
    fd.append("id", tutor.id);
    fd.append("day", String(day));
    // EditPinField wants a <form>, but for server-action invocation we
    // build the FormData manually and append the PIN via the wrapper.
    // The PIN is also re-validated server-side.
    fd.append("pin", document.cookie); // fallback; the action accepts pin via field or cookie
    startTransition(async () => {
      try {
        await toggleTutorClosedDay(fd);
      } catch {
        setOptimistic(null); // revert on error
      }
    });
  }

  // Read-only chip strip when locked
  if (!isUnlocked) {
    if (days.length === 0) return null;
    return (
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600">
          ปิดรับ
        </span>
        {days.map((d) => (
          <span
            key={d}
            className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700"
          >
            🚫 {LABELS[d - 1]}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        วันที่เปิด/ปิดรับ
      </span>
      {[1, 2, 3, 4, 5, 6, 7].map((d) => {
        const closed = days.includes(d);
        return (
          <form
            key={d}
            action={async (fd) => {
              if (!isUnlocked) return;
              fd.set("id", tutor.id);
              fd.set("day", String(d));
              const next = closed
                ? days.filter((x) => x !== d)
                : [...days, d].sort((a, b) => a - b);
              setOptimistic(next);
              startTransition(async () => {
                try {
                  await toggleTutorClosedDay(fd);
                } catch {
                  setOptimistic(null);
                }
              });
            }}
          >
            <EditPinField />
            <input type="hidden" name="id" value={tutor.id} />
            <input type="hidden" name="day" value={d} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold transition disabled:opacity-50"
              style={
                closed
                  ? { background: "#FEE2E2", borderColor: "#FCA5A5", color: "#B91C1C" }
                  : { background: "#ECFDF5", borderColor: "#A7F3D0", color: "#047857" }
              }
              title={closed ? `ครู ${tutor.display_name_th} ปิดรับ ${LABELS[d - 1]} — กดเปิด` : `กดปิด ${LABELS[d - 1]}`}
              onClick={(e) => {
                // Optimistic update happens via form action above; this
                // click handler is for keyboard a11y feedback. Falls back
                // to the form submit naturally.
                void e;
              }}
            >
              {closed ? "🚫" : "✓"} {LABELS[d - 1]}
            </button>
          </form>
        );
      })}
      {pending && (
        <span className="text-[10px] text-gray-400">บันทึก...</span>
      )}
    </div>
  );
}
