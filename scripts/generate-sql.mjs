// อ่าน .sheet-parsed.json → สร้าง SQL INSERT statements
// run: node scripts/generate-sql.mjs > supabase/seed_import.sql
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const { events, tutors } = JSON.parse(readFileSync(".sheet-parsed.json", "utf8"));

// ---------- normalize tutor names ----------
// คนเดียวกันสะกด 2 แบบ → รวมเป็นชื่อเดียว
const TUTOR_ALIAS = {
  ปอร์เช่: "ปอเช่",
  ถุงเเป้ง: "ถุงแป้ง", // เเ → แ (typo เก่า)
};

// short_code อังกฤษ — ต้อง unique + ไม่ชนกับของเดิม (MAY/BOY/NIM)
const SHORT_CODE = {
  นก: "NOK",
  ขลุ่ย: "KLY",
  ปอง: "PNG",
  ปอเช่: "PCH",
  อ๊อด: "AOD",
  ปาย: "PAI",
  ออม: "OOM",
  ถุงแป้ง: "TPN",
  เกรซ: "GRC",
  เบสท์: "BST",
  มายด์: "MND",
  ส้มโอ: "SMO",
  น้ำ: "NAM",
  บอส: "BOS",
  เบนซ์: "BNZ",
  อิล: "ILL",
};

// สีของวิชา (ตาม color legend ใน sheet)
const SUBJECT_COLOR = {
  คณิต: "#A78BFA",     // ม่วงอ่อน
  ฟิสิกส์: "#FBBF24",   // ส้ม-เหลือง
  เคมี: "#6EE7B7",      // เขียวอ่อน
  ชีวะ: "#86EFAC",      // เขียวมิ้นต์
  วิทย์: "#FCA5A5",     // แดงอ่อน
  อังกฤษ: "#93C5FD",    // ฟ้าอ่อน
};

// branch fixed: สาขาเชียงใหม่
const BRANCH_ID = "11111111-1111-1111-1111-111111111111";

// ---------- normalize all events + dedupe ----------
// dedupe: ถ้า (tutor, day, start_time, end_time) ซ้ำ → เก็บ row แรก
const seen = new Set();
const normalizedEvents = [];
for (const ev of events) {
  const tutor = TUTOR_ALIAS[ev.tutor] ?? ev.tutor;
  const key = `${tutor}|${ev.day_of_week}|${ev.start_time}|${ev.end_time}`;
  if (seen.has(key)) continue;
  seen.add(key);
  normalizedEvents.push({ ...ev, tutor });
}

// ---------- หา unique tutors ที่ยังไม่มีใน seed ----------
// ของเดิม seed มี: ครูเมย์(MAY), ครูบอย(BOY), ครูนิม(NIM) — ขลุ่ยที่อยู่ใน sheet อาจเป็นคนเดียวกันไหม?
// (ผมจะถือว่า ขลุ่ย ใน sheet = คนใหม่ ไม่ใช่ MAY/BOY/NIM)
const EXISTING_SEED_TUTORS = new Set(["เมย์", "บอย", "นิม"]);
const newTutors = [...new Set(normalizedEvents.map((e) => e.tutor))]
  .filter((t) => t && !EXISTING_SEED_TUTORS.has(t));

// gen uuid for each tutor
const tutorId = {};
for (const t of newTutors) {
  tutorId[t] = randomUUID();
}

// ---------- output SQL ----------
const lines = [];
lines.push("-- Auto-generated import SQL จาก Google Sheet ของพี่");
lines.push("-- รันใน Supabase SQL Editor (paste ทั้งไฟล์ → Run)");
lines.push("--");
lines.push("-- หลังรัน:");
lines.push("--   - tutor_profiles + " + newTutors.length + " ครูใหม่");
lines.push("--   - schedule_events + " + normalizedEvents.length + " คลาส (delivery_mode='online' default — ยังไม่ระบุห้อง)");
lines.push("--   - พี่ต้องไป edit/ลาก แต่ละ event ไปห้องที่ถูกต้องเอง (รอ edit feature)");
lines.push("");
// ไม่ wrap ใน BEGIN/COMMIT — ใช้ DO block per INSERT เพื่อให้ skip-on-conflict ได้
lines.push("");

// --- 1. insert new tutors ---
lines.push("-- ============================================================");
lines.push("-- 1. ครูใหม่ " + newTutors.length + " คน");
lines.push("-- ============================================================");
for (const t of newTutors) {
  const id = tutorId[t];
  const code = SHORT_CODE[t] ?? t.substring(0, 3).toUpperCase();
  lines.push(
    `insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, active)`,
  );
  lines.push(
    `values ('${id}', '${BRANCH_ID}', 'ครู${t}', '${code}', true)`,
  );
  lines.push("on conflict (id) do nothing;");
}
lines.push("");

// --- 2. insert events ---
lines.push("-- ============================================================");
lines.push("-- 2. ตารางคลาส " + normalizedEvents.length + " รายการ");
lines.push("--    หมายเหตุ: delivery_mode='online' default เพราะ sheet ไม่ระบุห้อง");
lines.push("--    หลัง import พี่ไป edit แต่ละ event เพื่อย้ายไปห้องที่ถูก");
lines.push("-- ============================================================");

for (const ev of normalizedEvents) {
  const titleEsc = ev.title.replace(/'/g, "''");
  const color = ev.subject ? SUBJECT_COLOR[ev.subject] ?? "#94A3B8" : "#94A3B8";
  const tid = tutorId[ev.tutor];
  if (!tid) continue; // ครูที่ไม่อยู่ใน list (เช่น MAY/BOY/NIM) → ข้าม (จะ duplicate)

  // wrap ใน DO block + EXCEPTION → skip ถ้า conflict (event ซ้อนเวลากัน)
  lines.push(`do $$ begin`);
  lines.push(`  insert into public.schedule_events`);
  lines.push(
    `    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,`,
  );
  lines.push(`     day_of_week, start_time, end_time, planned_student_count,`);
  lines.push(`     status, color_hex, source_type, source_ref)`);
  lines.push(
    `  values ('${BRANCH_ID}', 'class', '${titleEsc}', '${tid}', null, 'online',`,
  );
  lines.push(
    `          ${ev.day_of_week}, '${ev.start_time}', '${ev.end_time}', ${ev.planned_student_count ?? "null"},`,
  );
  lines.push(`          'scheduled', '${color}', 'import', 'sheet-import-2026-05');`);
  lines.push(`exception when exclusion_violation then null;`);
  lines.push(`end $$;`);
}
lines.push("");
lines.push("");
lines.push(`-- ✅ Imported ${normalizedEvents.length} events from ${newTutors.length} new tutors`);
lines.push("");
lines.push("-- ---------------------------------------------------------");
lines.push("-- ถ้าอยาก UNDO (ลบที่ import ทั้งหมด) — uncomment + run:");
lines.push("-- ---------------------------------------------------------");
lines.push("-- delete from public.schedule_events where source_ref = 'sheet-import-2026-05';");
const shortCodes = newTutors.map(t => `'${SHORT_CODE[t] ?? t.substring(0,3).toUpperCase()}'`).join(",");
lines.push(`-- delete from public.tutor_profiles where short_code in (${shortCodes});`);

console.log(lines.join("\n"));
