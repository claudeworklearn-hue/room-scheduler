"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch, TutorProfile } from "@/lib/supabase/types";
import { TutorFormDrawer } from "./TutorFormDrawer";
import { toggleTutorActive } from "@/app/admin/tutors/actions";
import { EditPinField } from "@/components/edit-mode/EditPinField";

type Props = {
  branches: Branch[];
  tutors: TutorProfile[];
};

export function TutorsManager({ branches, tutors }: Props) {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const [drawer, setDrawer] = useState<
    { mode: "create" } | { mode: "edit"; tutor: TutorProfile } | null
  >(null);

  const filtered = showInactive ? tutors : tutors.filter((t) => t.active);
  const branchById = new Map(branches.map((b) => [b.id, b]));

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="text-sm text-gray-500">
          ทั้งหมด {tutors.length} คน · ใช้งานอยู่ {tutors.filter((t) => t.active).length} คน
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
            />
            แสดงที่ปิดด้วย
          </label>

          <button
            type="button"
            onClick={() => setDrawer({ mode: "create" })}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            + เพิ่มติวเตอร์
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <Th>สี</Th>
              <Th>ชื่อ</Th>
              <Th>Short code</Th>
              <Th>สาขา</Th>
              <Th className="text-center">สถานะ</Th>
              <Th className="text-right">การกระทำ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  ยังไม่มีติวเตอร์
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id} className={t.active ? "" : "bg-gray-50 text-gray-400"}>
                <Td>
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-gray-300"
                    style={{ background: t.color_hex ?? "#E5E7EB" }}
                    title={t.color_hex ?? "ไม่กำหนด"}
                  />
                </Td>
                <Td>
                  <div className="font-medium text-gray-900">{t.display_name_th}</div>
                  {t.display_name_en && (
                    <div className="text-xs text-gray-500">{t.display_name_en}</div>
                  )}
                </Td>
                <Td className="font-mono font-semibold text-gray-900">{t.short_code}</Td>
                <Td>{(t.branch_id && branchById.get(t.branch_id)?.name_th) || "—"}</Td>
                <Td className="text-center">
                  {t.active ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700">
                      เปิดใช้
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs text-gray-600">
                      ปิด
                    </span>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDrawer({ mode: "edit", tutor: t })}
                      className="rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      แก้ไข
                    </button>
                    <form
                      action={async (fd) => {
                        await toggleTutorActive(fd);
                        router.refresh();
                      }}
                    >
                      <EditPinField />
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="active" value={String(!t.active)} />
                      <button
                        type="submit"
                        className={[
                          "rounded border px-2.5 py-1 text-xs",
                          t.active
                            ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                        ].join(" ")}
                      >
                        {t.active ? "ปิดใช้" : "เปิดใช้"}
                      </button>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TutorFormDrawer
        key={drawer?.mode === "edit" ? drawer.tutor.id : "create"}
        open={drawer !== null}
        mode={drawer?.mode ?? "create"}
        branches={branches}
        tutor={drawer?.mode === "edit" ? drawer.tutor : null}
        onClose={() => setDrawer(null)}
        onSaved={() => {
          setDrawer(null);
          router.refresh();
        }}
      />
    </>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
