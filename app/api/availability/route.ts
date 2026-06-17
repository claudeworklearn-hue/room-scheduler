/**
 * GET /api/availability?subject=chem&durationMin=120&days=2,4&minCapacity=1
 *
 * Free teaching slots for a subject (tutor free + room free), with NO PII.
 * Called by the LINE chatbot (ซันจิ) via n8n. Reuses the same core
 * (lib/availability-service → lib/availability) as the /book web page.
 *
 * Auth: header `x-api-key` must equal env AVAILABILITY_API_KEY.
 */
import { NextResponse } from "next/server";
import { loadAvailability } from "@/lib/availability-service";
import type { DayOfWeek } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // --- auth ---------------------------------------------------------------
  const expected = process.env.AVAILABILITY_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "availability API not configured (missing AVAILABILITY_API_KEY)" },
      { status: 503 },
    );
  }
  if (req.headers.get("x-api-key") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // --- params -------------------------------------------------------------
  const url = new URL(req.url);
  const subject = (url.searchParams.get("subject") ?? "").trim();
  const durationMin = Number(url.searchParams.get("durationMin") ?? "");
  if (!subject) {
    return NextResponse.json({ error: "missing ?subject" }, { status: 400 });
  }
  if (!Number.isFinite(durationMin) || durationMin < 30 || durationMin > 480) {
    return NextResponse.json(
      { error: "durationMin must be a number between 30 and 480" },
      { status: 400 },
    );
  }
  const daysParam = url.searchParams.get("days");
  const days = daysParam
    ? (daysParam
        .split(",")
        .map((d) => Number(d.trim()))
        .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7) as DayOfWeek[])
    : undefined;
  const minCapRaw = url.searchParams.get("minCapacity");
  const minCapacity = minCapRaw != null ? Number(minCapRaw) : undefined;

  try {
    const tutors = await loadAvailability({ subject, durationMin, days, minCapacity });
    return NextResponse.json({
      subject,
      durationMin,
      note: "slot = ว่างตามตารางคอร์สกลุ่ม (template รายสัปดาห์) · ครูยังไม่ยืนยันรับสอนเดี่ยว ต้องยืนยันกับครูก่อนปิดดีล · rooms = ห้องว่างตลอดช่วง · ไม่มี PII",
      tutors,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
