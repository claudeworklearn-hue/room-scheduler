import Link from "next/link";
import { BookingRequestsManager } from "@/components/booking/BookingRequestsManager";
import { AdminGuard } from "@/components/edit-mode/AdminGuard";

export const dynamic = "force-dynamic";

export default function BookingRequestsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">หน้าแรก</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">คำขอจองเรียนเดี่ยว</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">คำขอจองเรียนเดี่ยว</h1>
      <p className="mb-5 text-sm text-gray-500">
        คำขอจากหน้า{" "}
        <Link href="/book" className="text-brand-600 underline hover:text-brand-700">/book</Link>{" "}
        (ผู้ปกครองเลือกเวลาว่างเบื้องต้น) — กด <b>ยืนยัน</b> หลังเช็คกับครูแล้ว แล้วค่อยจัดลงตารางจริงในหน้า{" "}
        <Link href="/admin/room-schedule" className="text-brand-600 underline hover:text-brand-700">ตารางห้องเรียน</Link>
      </p>

      <AdminGuard label="คำขอจอง">
        <BookingRequestsManager />
      </AdminGuard>
    </main>
  );
}
