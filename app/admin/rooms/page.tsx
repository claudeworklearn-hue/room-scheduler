import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Branch, Room } from "@/lib/supabase/types";
import { RoomsManager } from "@/components/rooms/RoomsManager";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const supabase = createServerSupabase();

  const [{ data: branchesData, error: branchesError }, { data: roomsData, error: roomsError }] =
    await Promise.all([
      supabase.from("branches").select("*").order("name_th"),
      supabase
        .from("rooms")
        .select("*")
        .order("branch_id")
        .order("sort_order")
        .order("code"),
    ]);

  if (branchesError || roomsError) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-red-600">โหลดข้อมูลไม่ได้</h1>
        <pre className="mt-4 overflow-x-auto rounded bg-gray-900 p-4 text-xs text-gray-100">
          {branchesError?.message || roomsError?.message}
        </pre>
      </main>
    );
  }

  const branches = (branchesData ?? []) as Branch[];
  const rooms = (roomsData ?? []) as Room[];

  if (branches.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-gray-900">ยังไม่มีสาขา</h1>
        <p className="mt-3 text-gray-600">
          ไป Supabase → SQL Editor → รัน <code>supabase/seed.sql</code> ก่อน
          เพื่อเพิ่มสาขาตัวอย่าง
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">หน้าแรก</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">จัดการห้อง</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">จัดการห้อง</h1>
      <p className="mb-5 text-sm text-gray-500">
        สร้าง/แก้ไข/ปิดใช้ห้องเรียน — การเปลี่ยนแปลงจะ sync เข้าหน้าตารางห้องเรียนทันที
      </p>

      <RoomsManager branches={branches} rooms={rooms} />
    </main>
  );
}
