"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch, Room } from "@/lib/supabase/types";
import { RoomFormDrawer } from "./RoomFormDrawer";
import { toggleRoomActive } from "@/app/admin/rooms/actions";

const ROOM_TYPE_LABEL: Record<string, string> = {
  classroom: "ห้องเรียน",
  lab: "แล็บ",
  meeting: "ห้องประชุม",
  studio: "สตูดิโอ",
  other: "อื่น ๆ",
};

type Props = {
  branches: Branch[];
  rooms: Room[];
};

export function RoomsManager({ branches, rooms }: Props) {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const [drawer, setDrawer] = useState<
    { mode: "create" } | { mode: "edit"; room: Room } | null
  >(null);

  const filteredRooms = showInactive
    ? rooms
    : rooms.filter((r) => r.active);

  const branchById = new Map(branches.map((b) => [b.id, b]));

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            ทั้งหมด {rooms.length} ห้อง · ใช้งานอยู่{" "}
            {rooms.filter((r) => r.active).length} ห้อง
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
            />
            แสดงห้องที่ปิด
          </label>

          <button
            type="button"
            onClick={() => setDrawer({ mode: "create" })}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            + เพิ่มห้องใหม่
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <Th>รหัส</Th>
              <Th>ชื่อห้อง</Th>
              <Th className="text-right">ความจุ</Th>
              <Th>ประเภท</Th>
              <Th>สาขา</Th>
              <Th className="text-center">สถานะ</Th>
              <Th className="text-right">การกระทำ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRooms.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  ยังไม่มีห้องในรายการ
                </td>
              </tr>
            )}
            {filteredRooms.map((r) => (
              <tr key={r.id} className={r.active ? "" : "bg-gray-50 text-gray-400"}>
                <Td className="font-mono font-semibold text-gray-900">{r.code}</Td>
                <Td>
                  <div className="font-medium text-gray-900">{r.name_th}</div>
                  {r.location_note && (
                    <div className="text-xs text-gray-500">{r.location_note}</div>
                  )}
                </Td>
                <Td className="text-right tabular-nums">{r.capacity} คน</Td>
                <Td>{ROOM_TYPE_LABEL[r.room_type] ?? r.room_type}</Td>
                <Td>{branchById.get(r.branch_id)?.name_th ?? "—"}</Td>
                <Td className="text-center">
                  {r.active ? (
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
                      onClick={() => setDrawer({ mode: "edit", room: r })}
                      className="rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      แก้ไข
                    </button>
                    <form
                      action={async (fd) => {
                        await toggleRoomActive(fd);
                        router.refresh();
                      }}
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={String(!r.active)}
                      />
                      <button
                        type="submit"
                        className={[
                          "rounded border px-2.5 py-1 text-xs",
                          r.active
                            ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                        ].join(" ")}
                      >
                        {r.active ? "ปิดใช้" : "เปิดใช้"}
                      </button>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RoomFormDrawer
        open={drawer !== null}
        mode={drawer?.mode ?? "create"}
        branches={branches}
        room={drawer?.mode === "edit" ? drawer.room : null}
        onClose={() => setDrawer(null)}
        onSaved={() => {
          setDrawer(null);
          router.refresh();
        }}
      />
    </>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-4 py-3 ${className}`}>{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
