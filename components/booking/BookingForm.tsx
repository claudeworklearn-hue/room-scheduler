"use client";

import { useMemo, useState, useTransition } from "react";
import { SUBJECT_LIST } from "@/lib/subject-colors";
import type { TutorAvailability } from "@/lib/availability";
import type { DayOfWeek } from "@/lib/agents/types";
import { useLiff } from "@/components/booking/useLiff";
import { getBookingAvailability, createBookingRequest } from "@/app/book/actions";

const DAY_LABELS = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const DAY_SHORT = ["", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

const GRADES = ["ม.6", "ม.5", "ม.4", "ม.3", "ม.2", "ม.1", "ป.6", "ป.5", "ป.4", "อื่น ๆ"];

type Picked = {
  tutorId: string;
  tutorName: string;
  dayOfWeek: number;
  start: string;
  end: string;
  roomId: string | null;
  roomName: string | null;
};

export function BookingForm() {
  const liff = useLiff();

  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [duration, setDuration] = useState(120);
  const [filterDays, setFilterDays] = useState<number[]>([]); // ว่าง = ดูทุกวัน

  const [phase, setPhase] = useState<"choose" | "slots" | "form" | "done">("choose");
  const [results, setResults] = useState<TutorAvailability[]>([]);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // suggest 2hr for ม.ปลาย, 1.5hr otherwise
  function onGrade(g: string) {
    setGrade(g);
    if (g.startsWith("ม.4") || g.startsWith("ม.5") || g.startsWith("ม.6")) setDuration(120);
    else if (g) setDuration(90);
  }

  function search() {
    setError(null);
    if (!subject) {
      setError("เลือกวิชาก่อนนะครับ");
      return;
    }
    startTransition(async () => {
      const res = await getBookingAvailability(
        subject,
        duration,
        filterDays.length ? (filterDays.slice().sort((a, b) => a - b) as DayOfWeek[]) : undefined,
      );
      if (!res.ok) {
        setError(res.error ?? "ดึงเวลาว่างไม่ได้");
        return;
      }
      setResults(res.tutors ?? []);
      setPhase("slots");
    });
  }

  const subjectLabel = useMemo(
    () => SUBJECT_LIST.find((s) => s.key === subject)?.label ?? subject,
    [subject],
  );

  return (
    <div className="space-y-5">
      {/* สถานะ LINE */}
      <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
        {liff.status === "ready" && liff.lineUserId
          ? `🟢 เชื่อม LINE แล้ว${liff.displayName ? ` (${liff.displayName})` : ""}`
          : liff.status === "loading"
            ? "กำลังเชื่อม LINE…"
            : "เปิดผ่าน LINE เพื่อให้แอดมินติดต่อกลับสะดวก (หรือกรอกเบอร์ด้านล่างก็ได้)"}
      </div>

      {/* STEP 1 — เลือกวิชา/ชั้น/ชั่วโมง */}
      {phase === "choose" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">วิชาที่อยากเรียนเดี่ยว</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_LIST.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSubject(s.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    subject === s.key
                      ? "border-transparent text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                  style={subject === s.key ? { backgroundColor: s.color } : undefined}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ระดับชั้น</label>
              <select
                value={grade}
                onChange={(e) => onGrade(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">— เลือก —</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ครั้งละ</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value={90}>1.5 ชั่วโมง</option>
                <option value={120}>2 ชั่วโมง</option>
                <option value={150}>2.5 ชั่วโมง</option>
                <option value={180}>3 ชั่วโมง</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              วันที่สะดวก{" "}
              <span className="font-normal text-gray-400">(เลือกได้หลายวัน · ไม่เลือก = ดูทุกวัน)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const on = filterDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setFilterDays((prev) =>
                        prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      on
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {DAY_SHORT[d]}
                  </button>
                );
              })}
              {filterDays.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterDays([])}
                  className="px-2 py-1.5 text-sm text-gray-400 underline"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={search}
            disabled={pending}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {pending ? "กำลังหาเวลาว่าง…" : "ดูเวลาที่ว่าง"}
          </button>
        </div>
      )}

      {/* STEP 2 — เลือก slot */}
      {phase === "slots" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setPhase("choose")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← เปลี่ยนวิชา/ชั่วโมง
          </button>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            ⚠️ เวลาด้านล่างคือ “ว่างเบื้องต้น” ตามตารางคอร์สกลุ่ม — แอดมินจะ
            <b>ยืนยันกับครูอีกครั้ง</b>ก่อนนัดจริงนะครับ
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-gray-600">
              ยังไม่พบเวลาว่างของครู{subjectLabel}ในเงื่อนไขนี้ — ลองเปลี่ยนชั่วโมง หรือทักแอดมินสอบถามได้ครับ
            </p>
          ) : (
            <div className="space-y-4">
              {results.map((t) => (
                <div key={`${t.tutorId}-${t.dayOfWeek}`} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 text-sm font-medium text-gray-800">
                    {t.tutorName} · {DAY_LABELS[t.dayOfWeek]}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.freeSlots.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setPicked({
                            tutorId: t.tutorId,
                            tutorName: t.tutorName,
                            dayOfWeek: t.dayOfWeek,
                            start: s.start,
                            end: s.end,
                            roomId: s.rooms[0]?.roomId ?? null,
                            roomName: s.rooms[0]?.name ?? null,
                          });
                          setPhase("form");
                        }}
                        className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm text-brand-800 hover:bg-brand-100"
                      >
                        {s.start}–{s.end}
                        <span className="ml-1 text-xs text-gray-500">({s.rooms.length} ห้องว่าง)</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — กรอกข้อมูลติดต่อ + ส่งคำขอ */}
      {phase === "form" && picked && (
        <BookingDetailForm
          subject={subject}
          subjectLabel={subjectLabel}
          grade={grade}
          duration={duration}
          picked={picked}
          dayLabel={DAY_LABELS[picked.dayOfWeek]}
          lineUserId={liff.lineUserId}
          onBack={() => setPhase("slots")}
          onDone={() => setPhase("done")}
        />
      )}

      {/* STEP 4 — สำเร็จ */}
      {phase === "done" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-center">
          <div className="text-2xl">✅</div>
          <p className="mt-2 font-medium text-green-800">ส่งคำขอเรียบร้อยแล้ว</p>
          <p className="mt-1 text-sm text-green-700">
            แอดมินจะยืนยันเวลากับครูแล้วติดต่อกลับนะครับ ขอบคุณครับ 🙏
          </p>
        </div>
      )}
    </div>
  );
}

function BookingDetailForm(props: {
  subject: string;
  subjectLabel: string;
  grade: string;
  duration: number;
  picked: Picked;
  dayLabel: string;
  lineUserId: string | null;
  onBack: () => void;
  onDone: () => void;
}) {
  const { subject, subjectLabel, grade, duration, picked, dayLabel, lineUserId } = props;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formEl: HTMLFormElement) {
    setError(null);
    const fd = new FormData(formEl);
    fd.set("subject", subject);
    fd.set("grade_level", grade);
    fd.set("duration_minutes", String(duration));
    fd.set("tutor_profile_id", picked.tutorId);
    fd.set("tutor_name", picked.tutorName);
    fd.set("day_of_week", String(picked.dayOfWeek));
    fd.set("start_time", picked.start);
    fd.set("end_time", picked.end);
    if (picked.roomId) fd.set("room_id", picked.roomId);
    // line_user_id จาก LIFF เท่านั้น (ไม่ใช่ค่าจาก URL)
    if (lineUserId) fd.set("line_user_id", lineUserId);

    startTransition(async () => {
      const res = await createBookingRequest({}, fd);
      if (!res.ok) {
        setError(res.error ?? "ส่งคำขอไม่สำเร็จ");
        return;
      }
      props.onDone();
    });
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={props.onBack} className="text-sm text-gray-500 hover:text-gray-700">
        ← เลือกเวลาอื่น
      </button>

      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        <div className="font-medium">{subjectLabel} {grade && `· ${grade}`}</div>
        <div className="mt-1 text-gray-600">
          {picked.tutorName} · {dayLabel} {picked.start}–{picked.end}
          {picked.roomName && ` · ${picked.roomName}`}
        </div>
        <div className="mt-1 text-xs text-amber-700">ว่างเบื้องต้น — รอแอดมินยืนยันกับครู</div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-3"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">ชื่อผู้ติดต่อ *</label>
          <input
            name="contact_name"
            required
            maxLength={120}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="ชื่อ-สกุล ผู้ปกครอง/นักเรียน"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">เบอร์โทร</label>
          <input
            name="contact_phone"
            maxLength={32}
            inputMode="tel"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="ไว้ติดต่อกลับ"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">ชื่อนักเรียน</label>
          <input
            name="student_name"
            maxLength={120}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="(ถ้าต่างจากผู้ติดต่อ)"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">หมายเหตุ</label>
          <textarea
            name="note"
            maxLength={500}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="เช่น อยากเน้นบทไหน / สะดวกเริ่มเรียนเมื่อไหร่"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {pending ? "กำลังส่ง…" : "ส่งคำขอจอง"}
        </button>
      </form>
    </div>
  );
}
