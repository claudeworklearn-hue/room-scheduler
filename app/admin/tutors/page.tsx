import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Branch, TutorProfile, TutorBlackoutWindow } from "@/lib/supabase/types";
import { TutorsManager } from "@/components/tutors/TutorsManager";
import { AdminGuard } from "@/components/edit-mode/AdminGuard";

export const dynamic = "force-dynamic";

export default async function TutorsPage() {
  const supabase = createServerSupabase();

  const [{ data: branchesData, error: branchesError }, { data: tutorsData, error: tutorsError }] =
    await Promise.all([
      supabase.from("branches").select("*").order("name_th"),
      supabase
        .from("tutor_profiles")
        .select("*")
        .order("active", { ascending: false })
        .order("display_name_th"),
    ]);

  if (branchesError || tutorsError) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-red-600">โหลดข้อมูลไม่ได้</h1>
        <pre className="mt-4 overflow-x-auto rounded bg-gray-900 p-4 text-xs text-gray-100">
          {branchesError?.message || tutorsError?.message}
        </pre>
      </main>
    );
  }

  const branches = (branchesData ?? []) as Branch[];
  const tutors = (tutorsData ?? []) as TutorProfile[];

  // blackout windows (defensive: ถ้ายังไม่รัน migration 0017 → ปล่อยว่าง ไม่ทำหน้าพัง)
  const blackoutsByTutor: Record<string, TutorBlackoutWindow[]> = {};
  const bw = await supabase
    .from("tutor_blackout_windows")
    .select("*")
    .order("day_of_week")
    .order("start_time");
  if (!bw.error) {
    for (const w of (bw.data ?? []) as TutorBlackoutWindow[]) {
      (blackoutsByTutor[w.tutor_profile_id] ??= []).push(w);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">หน้าแรก</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">จัดการติวเตอร์</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">จัดการติวเตอร์</h1>
      <p className="mb-5 text-sm text-gray-500">
        เพิ่ม/แก้ไข/ปิดใช้ติวเตอร์ — short code ใช้เป็นชื่อย่อใน grid (เช่น GRT, มัยย์, ปอง)
      </p>

      <AdminGuard label="ข้อมูลจัดการติวเตอร์">
        <TutorsManager branches={branches} tutors={tutors} blackoutsByTutor={blackoutsByTutor} />
      </AdminGuard>
    </main>
  );
}
