import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  Branch,
  Course,
  PendingBooking,
  TutorProfile,
} from "@/lib/supabase/types";
import { PendingsManager } from "@/components/waiting-list/PendingsManager";
import { AdminGuard } from "@/components/edit-mode/AdminGuard";

export const dynamic = "force-dynamic";

export default async function WaitingListPage() {
  const supabase = createServerSupabase();

  const [branchesQ, coursesQ, tutorsQ, pendingsQ] = await Promise.all([
    supabase.from("branches").select("*").eq("active", true).order("name_th"),
    supabase.from("courses").select("*").eq("active", true).order("title_th"),
    supabase
      .from("tutor_profiles")
      .select("*")
      .eq("active", true)
      .order("display_name_th"),
    supabase
      .from("pending_bookings")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const error =
    branchesQ.error || coursesQ.error || tutorsQ.error || pendingsQ.error;
  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-red-600">โหลดข้อมูลไม่ได้</h1>
        <pre className="mt-4 overflow-x-auto rounded bg-gray-900 p-4 text-xs text-gray-100">
          {error.message}
        </pre>
        <p className="mt-4 text-sm text-gray-600">
          ถ้า error ที่ <code>pending_bookings</code> — ยังไม่ได้รัน migration{" "}
          <code>0003_pending_bookings.sql</code>
        </p>
      </main>
    );
  }

  const branches = (branchesQ.data ?? []) as Branch[];
  const courses = (coursesQ.data ?? []) as Course[];
  const tutors = (tutorsQ.data ?? []) as TutorProfile[];
  const pendings = (pendingsQ.data ?? []) as PendingBooking[];

  if (branches.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-gray-900">ยังไม่มีสาขา</h1>
        <p className="mt-3 text-gray-600">
          รัน <code>supabase/seed.sql</code> ก่อน
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">
          หน้าแรก
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">คลังรอจัดตาราง</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        คลังรอจัดตาราง (Waiting list)
      </h1>
      <p className="mb-5 text-sm text-gray-500">
        ดีลที่ทำสัญญาแล้วแต่ยังไม่ได้กำหนดวัน/เวลา/ห้อง — จากหน้า{" "}
        <Link
          href="/admin/room-schedule"
          className="text-brand-600 underline hover:text-brand-700"
        >
          ตารางห้องเรียน
        </Link>{" "}
        จะมี side panel โผล่มาให้ลากการ์ดลงตารางได้เลย
      </p>

      <AdminGuard label="คลังรอจัดตาราง">
        <PendingsManager
          branches={branches}
          courses={courses}
          tutors={tutors}
          pendings={pendings}
        />
      </AdminGuard>
    </main>
  );
}
