// Parse extracted Google Sheet (.sheet-raw.md) → JSON of schedule events
// run: node scripts/parse-sheet.mjs
import { readFileSync, writeFileSync } from "node:fs";

const raw = readFileSync(".sheet-raw.md", "utf8");
const lines = raw.split("\n");

const DAY_NAMES = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

// regex หา "HH.MM-HH.MM" หรือ "HH.MM - HH.MM" หรือ "HH:MM-HH:MM"
const TIME_RX = /(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/;

// regex หา "พี่XXX" / "ครูXXX" — ชื่อครู (ห้ามจับ "น้อง" เพราะคือนักเรียน)
const TUTOR_RX = /(?:พี่|ครู)\s*([฀-๿a-zA-Z]+)/g;

// regex หา "(N)" — จำนวนนักเรียน
const COUNT_RX = /\((\d{1,3})\)/;

// regex หา "ม.X" หรือ "ป.X"
const GRADE_RX = /(ม|ป)\.(\d)/;

// คำสำคัญของวิชา
const SUBJECTS = {
  คณิต: "คณิต",
  ฟิสิกส: "ฟิสิกส์",
  ฟิสิกส์: "ฟิสิกส์",
  ฟิสิก: "ฟิสิกส์",
  เคมี: "เคมี",
  ชีวะ: "ชีวะ",
  Bio: "ชีวะ",
  BIO: "ชีวะ",
  วิทย: "วิทย์",
  วิทย์: "วิทย์",
  อังกฤษ: "อังกฤษ",
  English: "อังกฤษ",
};

function detectSubject(text) {
  for (const [k, v] of Object.entries(SUBJECTS)) {
    if (text.includes(k)) return v;
  }
  return null;
}

function detectGrade(text) {
  const m = text.match(GRADE_RX);
  if (!m) return null;
  return m[1] + m[2]; // "ม4", "ป6"
}

// แปลง "ม4" → "M4", "ป6" → "P6"
function gradeToCode(g) {
  if (!g) return "ETC";
  if (g.startsWith("ม")) return "M" + g.slice(1);
  if (g.startsWith("ป")) return "P" + g.slice(1);
  return "ETC";
}

function parseTime(text) {
  const m = text.match(TIME_RX);
  if (!m) return null;
  const start = `${m[1].padStart(2, "0")}:${m[2]}:00`;
  const end = `${m[3].padStart(2, "0")}:${m[4]}:00`;
  return { start, end };
}

// ---------------- main parse ----------------
const events = [];
const tutorsFound = new Set();

let currentTutor = null; // ครูที่ table header บอก
let inTutorTable = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) {
    inTutorTable = false;
    currentTutor = null;
    continue;
  }
  // หา table header รูป "XXX/วิชา - กลุ่ม" หรือ "XXX/วิชา" หรือ "ครูXXX/..."
  // เช่น "นก/ชีวะ - กลุ่ม", "ขลุ่ย/คณิต/ฟิสิกส์ - กลุ่ม", "ปอง/เคมี/คณิต ม.ต้น"
  // (มี | ทั้งแถวเป็น markdown table)
  if (line.startsWith("|") && line.includes("เวลา/")) {
    // ดึง cell แรก (ชื่อ table)
    const firstCell = line.split("|")[1]?.trim() ?? "";
    // เช็คว่า cell แรกเป็นชื่อครู (ไม่ใช่ "A (24)" หรือว่าง)
    if (
      firstCell &&
      !firstCell.match(/^[A-Z]+\s*\(\d+\)$/) &&  // not "A (24)"
      !firstCell.match(/^หน้า|หลัง|บน(ใหญ่|เล็ก)$/) &&
      !firstCell.includes("ห้อง") &&
      !firstCell.includes("MONTFORT") &&
      !firstCell.includes("NO_HEADER")
    ) {
      // น่าจะเป็น tutor table header
      const tutorMatch = firstCell.match(/^(?:พี่|ครู)?\s*([฀-๿a-zA-Z]+)/);
      if (tutorMatch) {
        currentTutor = tutorMatch[1].trim();
        tutorsFound.add(currentTutor);
        inTutorTable = true;
        continue;
      }
    }
  }
  if (!inTutorTable || !currentTutor) continue;

  // ในแถว: ดู cell แรก = ชื่อวัน, cell อื่น ๆ = ข้อมูลคลาส
  const cells = line.split("|").map((c) => c.trim());
  if (cells.length < 3) continue;
  const dayCell = cells[1]?.replace(/\(online\)/i, "").trim();
  const dayIndex = DAY_NAMES.indexOf(dayCell);
  if (dayIndex === -1) continue; // ไม่ใช่ row ที่ขึ้นต้นด้วยชื่อวัน

  const dayOfWeek = dayIndex + 1; // 1..7

  // วน cell ทุก cell เก็บที่มีข้อมูล (มีเวลาชัดเจน)
  for (let c = 2; c < cells.length - 1; c++) {
    const text = cells[c];
    if (!text) continue;
    const time = parseTime(text);
    if (!time) continue; // skip cells without explicit time

    const subject = detectSubject(text);
    const grade = detectGrade(text);
    const count = text.match(COUNT_RX)?.[1];

    // หาครูที่อยู่ใน cell (ถ้ามีเขียนเฉพาะ เช่น "(พี่ปอง)" จะ override currentTutor)
    let tutorInCell = currentTutor;
    const tutorInText = [...text.matchAll(TUTOR_RX)]
      .map((m) => m[1])
      .find((n) => n && n.length > 1);
    if (tutorInText) tutorInCell = tutorInText;

    // title = clean ของ cell text (เอา markdown escape ออก)
    const title = text
      .replace(/\\#/g, "#")
      .replace(/&#9;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    events.push({
      tutor: tutorInCell,
      day_of_week: dayOfWeek,
      start_time: time.start,
      end_time: time.end,
      subject,
      grade_code: gradeToCode(grade),
      planned_student_count: count ? Number(count) : null,
      title,
    });

    tutorsFound.add(tutorInCell);
  }
}

writeFileSync(
  ".sheet-parsed.json",
  JSON.stringify({ events, tutors: [...tutorsFound] }, null, 2),
  "utf8",
);

console.log(`Extracted ${events.length} events from ${tutorsFound.size} tutors`);
console.log(`Tutors:`, [...tutorsFound].join(", "));
