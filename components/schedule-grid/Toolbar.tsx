"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import type { Branch, DayOfWeek } from "@/lib/supabase/types";
import { WEEK_DAYS_TH_SHORT, WEEK_DAYS_TH_LONG } from "@/lib/time/week";

export type ViewMode = "daily" | "weekly";

type Props = {
  view: ViewMode;
  dow: DayOfWeek; // selected day-of-week (สำหรับ daily view)
  branches: Branch[];
  selectedBranchId: string;
};

export function Toolbar({ view, dow, branches, selectedBranchId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function go(newParams: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(newParams)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Daily/Weekly toggle */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <ToggleBtn
            active={view === "daily"}
            onClick={() => go({ view: "daily" })}
          >
            รายวัน
          </ToggleBtn>
          <ToggleBtn
            active={view === "weekly"}
            onClick={() => go({ view: "weekly" })}
          >
            ภาพรวมสัปดาห์
          </ToggleBtn>
        </div>

        {view === "daily" && (
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
            {([1, 2, 3, 4, 5, 6, 7] as DayOfWeek[]).map((d) => (
              <DayTabBtn
                key={d}
                active={dow === d}
                onClick={() => go({ dow: String(d) })}
                disabled={isPending}
              >
                {WEEK_DAYS_TH_SHORT[d - 1]}
              </DayTabBtn>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {view === "daily" && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-gray-400">
              วันในสัปดาห์
            </div>
            <div className="text-base font-semibold text-gray-900">
              วัน{WEEK_DAYS_TH_LONG[dow - 1]} (ทุกสัปดาห์)
            </div>
          </div>
        )}

        {branches.length > 0 && (
          <select
            value={selectedBranchId}
            onChange={(e) => go({ branch: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            aria-label="เลือกสาขา"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_th}
              </option>
            ))}
          </select>
        )}
      </div>
    </header>
  );
}

function ToggleBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md px-3 py-1 text-xs font-medium transition",
        active
          ? "bg-brand-500 text-white"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function DayTabBtn({
  children,
  active,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "min-w-[44px] rounded-md px-2 py-1 text-sm font-medium transition",
        active
          ? "bg-brand-500 text-white"
          : "text-gray-700 hover:bg-gray-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
