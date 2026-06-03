"use client";

import { useEditPin } from "./useEditMode";

type Props = {
  children: React.ReactNode;
  /** what's being protected — shown in the placeholder */
  label?: string;
};

/**
 * Client-side gate for admin-only sections. Renders children only when
 * the visitor has unlocked the edit PIN. Used to hide whole pages
 * (rooms, tutors, reports, waiting-list) from anonymous viewers — same
 * posture as the schedule grid's interactive flag.
 *
 * Wrap each page's main content with this. The Server Component that
 * fetches data still runs, but the children never mount client-side
 * when locked, so the actual fields aren't rendered into the DOM.
 */
export function AdminGuard({ children, label = "หน้านี้" }: Props) {
  const { isUnlocked, ready } = useEditPin();

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
          {label}ถูกซ่อนไว้
        </div>
        <p className="mt-2 text-sm text-amber-800">
          กดปุ่ม <span className="font-semibold">&quot;🔒 โหมดดูอย่างเดียว&quot;</span>{" "}
          มุมซ้ายล่างเพื่อใส่ PIN
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
