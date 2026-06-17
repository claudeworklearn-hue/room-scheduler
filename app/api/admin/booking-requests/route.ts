/**
 * Admin-only API for booking requests (มี PII: ชื่อ/เบอร์/line_user_id).
 *
 *   GET  → list (newest first)
 *   POST → review one: body { id, action: "confirm" | "reject" }
 *
 * Auth: header `x-edit-pin` ต้องตรงกับ EDIT_PIN (เหมือน gate ของ server actions).
 * อ่าน/เขียนผ่าน service-role (เลี่ยง RLS ฝั่ง server). ทำให้ PII ไม่ถูกส่งออก
 * ใน RSC payload ของหน้า admin ตอนที่ยังไม่ปลดล็อก (client ดึงหลังใส่ PIN เท่านั้น).
 */
import { NextResponse } from "next/server";
import { checkEditPin } from "@/lib/edit-pin";
import { createServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const err = checkEditPin(req.headers.get("x-edit-pin"));
  if (err) return NextResponse.json({ error: err }, { status: 401 });

  const supabase = createServiceSupabase();
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: Request) {
  const err = checkEditPin(req.headers.get("x-edit-pin"));
  if (err) return NextResponse.json({ error: err }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  if (!body.id || (body.action !== "confirm" && body.action !== "reject")) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const status = body.action === "confirm" ? "confirmed" : "rejected";

  const supabase = createServiceSupabase();
  const { error } = await supabase
    .from("booking_requests")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
