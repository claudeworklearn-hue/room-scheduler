import Link from "next/link";
import { AdminGuard } from "@/components/edit-mode/AdminGuard";
import { AgentPanel } from "@/components/agents/AgentPanel";
import { listAgents } from "@/lib/agents/registry";

export const dynamic = "force-dynamic";

export default function AgentsPage() {
  const agents = listAgents();
  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">หน้าแรก</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">ผู้ช่วย AI</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">🤖 ผู้ช่วยจัดตาราง</h1>
      <p className="mb-6 text-sm text-gray-500">
        ทดสอบ agent แต่ละตัว — AI แนะนำ/วิเคราะห์เท่านั้น
        ไม่บันทึก DB จนกว่าจะกด confirm ผ่าน commitScheduleWithValidation
      </p>

      <AdminGuard label="ผู้ช่วยจัดตาราง">
        <AgentPanel agents={agents} />
      </AdminGuard>
    </main>
  );
}
