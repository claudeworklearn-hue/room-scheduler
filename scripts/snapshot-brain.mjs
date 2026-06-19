// ดึง snapshot ข้อมูลตาราง room-scheduler → เขียนลงสมอง (khlui-brain vault)
// รัน: node scripts/snapshot-brain.mjs   (อ่าน anon key จาก .env.local)
//
// 🔒 ตัด PII ออก: ไม่ดึง schedule_events.title_th / student_names (มีชื่อนักเรียน)
//    ดึงเฉพาะ วัน/เวลา/ครู/ห้อง/ประเภท — ปลอดภัยที่จะ sync ขึ้น GitHub
import { readFileSync, writeFileSync } from "node:fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const cfg = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
const BASE = cfg("NEXT_PUBLIC_SUPABASE_URL");
const ANON = cfg("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const H = { apikey: ANON, Authorization: `Bearer ${ANON}` };
const rest = (p) => fetch(`${BASE}/rest/v1/${p}`, { headers: H }).then((r) => r.json());

const DAY = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];
const SUBJ = { physics: "ฟิสิกส์", chem: "เคมี", bio: "ชีวะ", math: "คณิต", science: "วิทย์", english: "อังกฤษ" };
const hm = (t) => (t || "").slice(0, 5);

const [tutors, rooms, courses, events, blackouts] = await Promise.all([
  rest("tutor_profiles?select=id,display_name_th,short_code,subjects,closed_days_for_new,accepts_new_private&active=eq.true&order=display_name_th"),
  rest("rooms?select=id,name_th,code,capacity,building&active=eq.true&order=sort_order"),
  rest("courses?select=title_th,subject,course_code&active=eq.true"),
  rest("schedule_events?select=day_of_week,start_time,end_time,tutor_profile_id,room_id,code_prefix,delivery_mode,status&status=in.(draft,scheduled)&limit=2000"),
  rest("tutor_blackout_windows?select=tutor_profile_id,day_of_week,start_time,end_time").catch(() => []),
]);

const tName = new Map(tutors.map((t) => [t.id, t.display_name_th]));
const rName = new Map(rooms.map((r) => [r.id, r.name_th]));
const bw = Array.isArray(blackouts) ? blackouts : [];

const today = new Date().toISOString().slice(0, 10);
let md = `# 📊 ตารางห้อง — snapshot ข้อมูล (${today})\n`;
md += `> ดึงจาก Supabase room-scheduler (\`kbhdvpeorchcbgouaayi\`) · **ตัด PII (ชื่อนักเรียน) ออกแล้ว** · rerun: \`room-scheduler/scripts/snapshot-brain.mjs\`\n`;
md += `> ครู ${tutors.length} · ห้อง ${rooms.length} · คอร์ส ${courses.length} · คาบเรียน ${events.length}\n\n`;

// ── ครู
md += `## 👩‍🏫 ครู (${tutors.length})\n\n`;
md += `| ชื่อ | code | วิชา | รับเดี่ยว | ปิดทั้งวัน | ปิดบางช่วง |\n|---|---|---|---|---|---|\n`;
for (const t of tutors) {
  const subj = (t.subjects || []).map((s) => SUBJ[s] || s).join(", ") || "—";
  const closed = (t.closed_days_for_new || []).map((d) => DAY[d]).join(", ") || "—";
  const myBw = bw.filter((b) => b.tutor_profile_id === t.id);
  const bwTxt = myBw.length
    ? myBw.map((b) => `${DAY[b.day_of_week]} ${hm(b.start_time)}-${hm(b.end_time)}`).join("; ")
    : "—";
  const acc = t.accepts_new_private === false ? "✗ ไม่รับ" : "✓ รับ";
  md += `| ${t.display_name_th} | ${t.short_code} | ${subj} | ${acc} | ${closed} | ${bwTxt} |\n`;
}

// ── ห้อง
md += `\n## 🚪 ห้อง (${rooms.length})\n\n| ชื่อ | code | ความจุ | ตึก |\n|---|---|---|---|\n`;
for (const r of rooms) md += `| ${r.name_th} | ${r.code} | ${r.capacity} | ${r.building || "—"} |\n`;

// ── คอร์ส
md += `\n## 📚 คอร์ส (${courses.length})\n\n`;
for (const c of courses) md += `- ${c.title_th}${c.subject ? ` · ${SUBJ[c.subject] || c.subject}` : ""}${c.course_code ? ` · \`${c.course_code}\`` : ""}\n`;

// ── ตารางคาบ ต่อครู (ตัดชื่อนักเรียน — เหลือ วัน/เวลา/ห้อง/ประเภท)
md += `\n## 🗓️ ตารางคาบต่อครู (${events.length} คาบ · ไม่มีชื่อนักเรียน)\n`;
const byTutor = new Map();
for (const e of events) {
  const k = e.tutor_profile_id || "(ไม่ระบุครู)";
  (byTutor.get(k) || byTutor.set(k, []).get(k)).push(e);
}
const sortKey = (e) => e.day_of_week * 10000 + Number(hm(e.start_time).replace(":", ""));
for (const [tid, evs] of byTutor) {
  evs.sort((a, b) => sortKey(a) - sortKey(b));
  md += `\n**${tName.get(tid) || tid}** (${evs.length} คาบ)\n`;
  for (const e of evs) {
    const room = rName.get(e.room_id) || (e.delivery_mode === "online" ? "ออนไลน์" : "—");
    const type = e.code_prefix === "PV" ? "เดี่ยว" : "กลุ่ม";
    md += `- ${DAY[e.day_of_week]} ${hm(e.start_time)}–${hm(e.end_time)} · ${room} · ${type}\n`;
  }
}

md += `\n---\n*snapshot นี้ตัดชื่อนักเรียน/ชื่อคอร์ส private ออก (มี PII) — ดูรายละเอียดเต็มในระบบจริง room-scheduler เท่านั้น*\n`;

const out = new URL("../../khlui-brain/Projects/room-scheduler-data.md", import.meta.url);
writeFileSync(out, md, "utf8");
console.log(`✓ wrote ${md.length} chars → khlui-brain/Projects/room-scheduler-data.md`);
console.log(`  tutors=${tutors.length} rooms=${rooms.length} courses=${courses.length} events=${events.length} blackouts=${bw.length}`);
