import Link from "next/link";
import { BookingForm } from "@/components/booking/BookingForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "จองเรียนเดี่ยว — Knowledge Academy",
};

export default function BookPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">← หน้าหลัก</Link>
      </nav>
      <h1 className="text-xl font-bold text-gray-900">จองเรียนเดี่ยว / เช็คเวลาเรียน</h1>
      <p className="mt-1 mb-5 text-sm text-gray-500">
        เลือกวิชาแล้วดูเวลาที่ครูว่างเบื้องต้น → ส่งคำขอ แล้วแอดมินจะยืนยันกับครูแล้วติดต่อกลับครับ
      </p>
      <BookingForm />
    </main>
  );
}
