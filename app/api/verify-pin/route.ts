import { NextResponse } from "next/server";
import { checkEditPin } from "@/lib/edit-pin";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { pin?: string };
  const err = checkEditPin(body.pin);
  if (err) return NextResponse.json({ ok: false, error: err }, { status: 401 });
  return NextResponse.json({ ok: true });
}
