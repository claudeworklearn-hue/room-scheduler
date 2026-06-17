"use client";

import { useCallback, useEffect, useState } from "react";
import { useEditPin } from "@/components/edit-mode/useEditMode";
import { subjectLabel } from "@/lib/subject-colors";
import type { BookingRequest } from "@/lib/supabase/types";

const DAY = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ รอยืนยัน",
  confirmed: "✅ ยืนยันแล้ว",
  rejected: "✖ ปฏิเสธ",
  cancelled: "ยกเลิก",
};

export function BookingRequestsManager() {
  const { pin, ready } = useEditPin();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/booking-requests", {
        headers: { "x-edit-pin": pin },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "โหลดไม่ได้");
      setRequests(json.requests ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [pin]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function review(id: string, action: "confirm" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/booking-requests", {
        method: "POST",
        headers: { "content-type": "application/json", "x-edit-pin": pin },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "บันทึกไม่ได้");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">กำลังโหลดคำขอ…</p>;
  if (error) return <p className="text-sm text-red-600">ผิดพลาด: {error}</p>;

  const pending = requests.filter((r) => r.status === "pending");
  const done = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          รอยืนยัน ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีคำขอใหม่</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <Card key={r.id} r={r} busy={busyId === r.id} onReview={review} />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-500">ที่จัดการแล้ว ({done.length})</h2>
          <div className="space-y-2">
            {done.map((r) => (
              <Card key={r.id} r={r} busy={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Card(props: {
  r: BookingRequest;
  busy: boolean;
  onReview?: (id: string, action: "confirm" | "reject") => void;
}) {
  const { r, busy, onReview } = props;
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-gray-800">
          {subjectLabel(r.subject)} {r.grade_level && `· ${r.grade_level}`}
        </div>
        <span className="shrink-0 text-xs text-gray-500">{STATUS_LABEL[r.status] ?? r.status}</span>
      </div>
      <div className="mt-1 text-gray-600">
        {r.tutor_name ?? "—"} · {DAY[r.day_of_week]} {r.start_time?.slice(0, 5)}–{r.end_time?.slice(0, 5)}
        <span className="ml-1 text-xs text-gray-400">({r.duration_minutes} นาที)</span>
      </div>
      <div className="mt-1 text-gray-700">
        👤 {r.contact_name}
        {r.contact_phone && ` · ☎ ${r.contact_phone}`}
        {r.student_name && ` · นร. ${r.student_name}`}
        {r.line_user_id && <span className="ml-1 text-xs text-green-600">· LINE ✓</span>}
      </div>
      {r.note && <div className="mt-1 text-xs text-gray-500">📝 {r.note}</div>}

      {onReview && r.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onReview(r.id, "confirm")}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy ? "…" : "✅ ยืนยัน"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReview(r.id, "reject")}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 disabled:opacity-50"
          >
            ✖ ปฏิเสธ
          </button>
        </div>
      )}
    </div>
  );
}
