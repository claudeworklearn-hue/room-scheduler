"use client";

import { useState } from "react";
import { useEditPin } from "./useEditMode";

/**
 * Floating lock/unlock pill. Render once per page (we put it in the root
 * layout so it sits on every admin/staff view). When the gate env var is
 * not set on the server, this still appears — but the server ignores the
 * PIN field, so it's effectively a no-op. We surface that as "ไม่ได้ล็อก"
 * on first-time setup by exposing window.__editGateEnabled via a script
 * tag in the layout (see RootEditModeToggle).
 */

type Props = {
  /** When the server's EDIT_PIN env var is unset, show a hint instead of the lock. */
  gateEnabled: boolean;
};

export function EditModeToggle({ gateEnabled }: Props) {
  const { isUnlocked, unlock, lock, ready } = useEditPin();
  const [verifying, setVerifying] = useState(false);

  if (!ready) {
    return (
      <div className="fixed bottom-4 left-4 z-50 select-none rounded-full bg-gray-100 px-4 py-2 text-xs text-gray-400 shadow-md">
        …
      </div>
    );
  }

  if (!gateEnabled) {
    return (
      <div
        className="fixed bottom-4 left-4 z-50 select-none rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 shadow-sm"
        title="ยังไม่ได้ตั้ง EDIT_PIN ใน server — ใครก็แก้ได้"
      >
        ⚠ โหมด dev — ยังไม่ล็อก
      </div>
    );
  }

  if (isUnlocked) {
    return (
      <button
        type="button"
        onClick={() => {
          if (confirm("ออกจากโหมดแก้ไข? (browser นี้จะกลับเป็นโหมดดูอย่างเดียว)")) {
            lock();
          }
        }}
        className="fixed bottom-4 left-4 z-50 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
      >
        ✏️ โหมดแก้ไข — กดเพื่อล็อก
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={verifying}
      onClick={async () => {
        const input = prompt("ใส่ PIN เพื่อเปิดโหมดแก้ไข");
        if (!input) return;
        setVerifying(true);
        // Verify against the server before storing. We can call any server
        // action; pick a cheap one. Importing here would create a server
        // bundle dep, so we hit a tiny route handler.
        try {
          const res = await fetch("/api/verify-pin", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pin: input }),
          });
          const j = (await res.json()) as { ok?: boolean; error?: string };
          if (j.ok) {
            unlock(input);
          } else {
            alert(j.error ?? "PIN ไม่ถูก");
          }
        } finally {
          setVerifying(false);
        }
      }}
      className="fixed bottom-4 left-4 z-50 rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-gray-700 disabled:opacity-50"
    >
      🔒 {verifying ? "กำลังตรวจ..." : "โหมดดูอย่างเดียว — กดเพื่อใส่ PIN"}
    </button>
  );
}
