"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TutorProfile, TutorBlackoutWindow } from "@/lib/supabase/types";
import { addTutorBlackout, removeTutorBlackout } from "@/app/admin/tutors/actions";
import { EditPinField } from "@/components/edit-mode/EditPinField";

const DAY = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

/**
 * Modal สำหรับตั้ง "ช่วงเวลาที่ครูไม่รับสอน" (blackout) รายสัปดาห์.
 * ปิดเป็นช่วงเวลา (เช่น จันทร์ 16:00–18:00) — availability จะไม่เสนอเวลานี้ให้จอง.
 * (ปิด "ทั้งวัน" ใช้ toggle วันที่หน้า deal-planner — คนละอัน)
 */
export function TutorBlackoutEditor({
  tutor,
  windows,
  onClose,
}: {
  tutor: TutorProfile;
  windows: TutorBlackoutWindow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("18:00");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">🚫 เวลาที่ไม่รับสอน — {tutor.display_name_th}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          ปิดเป็นช่วงเวลา (เช่น จันทร์ 16:00–18:00) — ระบบจะไม่เสนอเวลานี้ให้ผู้ปกครองจอง
        </p>

        {/* list windows */}
        <div className="mt-3 space-y-2">
          {windows.length === 0 && (
            <p className="text-sm text-gray-400">ยังไม่มีช่วงเวลาปิด</p>
          )}
          {windows.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm"
            >
              <span className="text-red-800">
                {DAY[w.day_of_week]} {w.start_time.slice(0, 5)}–{w.end_time.slice(0, 5)}
              </span>
              <form
                action={(fd) =>
                  startTransition(async () => {
                    await removeTutorBlackout(fd);
                    router.refresh();
                  })
                }
              >
                <EditPinField />
                <input type="hidden" name="window_id" value={w.id} />
                <button
                  type="submit"
                  disabled={pending}
                  className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                >
                  ลบ
                </button>
              </form>
            </div>
          ))}
        </div>

        {/* add window */}
        <form
          action={(fd) => {
            setErr(null);
            if (start >= end) {
              setErr("เวลาจบต้องหลังเวลาเริ่ม");
              return;
            }
            startTransition(async () => {
              await addTutorBlackout(fd);
              router.refresh();
            });
          }}
          className="mt-4 space-y-2 border-t border-gray-100 pt-3"
        >
          <EditPinField />
          <input type="hidden" name="id" value={tutor.id} />
          <div className="flex items-center gap-2">
            <select
              name="day_of_week"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>{DAY[d]}</option>
              ))}
            </select>
            <input
              type="time"
              name="start_time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              required
            />
            <span className="text-gray-400">–</span>
            <input
              type="time"
              name="end_time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              required
            />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "บันทึก…" : "+ เพิ่มช่วงเวลาปิด"}
          </button>
        </form>

        <p className="mt-3 text-[11px] text-gray-400">
          💡 "ปิดทั้งวัน" ตั้งได้ที่หน้า <b>วางแผนดีล</b> (toggle วัน) · อันนี้สำหรับปิด "บางช่วงเวลา"
        </p>
      </div>
    </div>
  );
}
