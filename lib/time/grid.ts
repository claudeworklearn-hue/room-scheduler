// Schedule grid time helpers (template/recurring model)
//
// หลักคิด:
//   - schedule_events เก็บเป็น day_of_week + start_time + end_time (ไม่มีวันที่)
//   - grid 1 วัน = หลาย slot ขนาด 30 นาที ตั้งแต่ DAY_START_HOUR ถึง DAY_END_HOUR
//   - แต่ละ event คำนวณว่ากิน slot ไหนถึง slot ไหนใน grid

export const SLOT_MINUTES = 30;
export const DAY_START_HOUR = 8;   // 08:00 — รองรับคลาสเช้าเสาร์-อาทิตย์ (08:00, 08:30 ฯลฯ)
export const DAY_END_HOUR = 22;    // 22:00 — เผื่อคลาสค่ำ
export const SLOTS_PER_DAY =
  ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;

/** "17:30:00" หรือ "17:30" → "17:30" */
export function shortHHMM(timeStr: string): string {
  return timeStr.slice(0, 5);
}

/** "17:30:00" → จำนวนนาทีตั้งแต่เที่ยงคืน (17*60+30 = 1050) */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * คำนวณตำแหน่ง slot ของ event ใน grid
 * - startSlot = index ของช่องเริ่มต้น (0-based, อิงจาก DAY_START_HOUR)
 * - span = จำนวน slot ที่กิน
 *
 * ถ้า event ล้นออกนอก DAY_START_HOUR / DAY_END_HOUR จะ clip ให้พอดี grid
 * คืนค่า null ถ้า event อยู่นอกช่วงเวลาของ grid ทั้งหมด
 */
export function eventSlotRange(
  startTime: string,
  endTime: string,
): { startSlot: number; span: number } | null {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const gridStartMin = DAY_START_HOUR * 60;
  const gridEndMin = DAY_END_HOUR * 60;

  const clippedStart = Math.max(startMin, gridStartMin);
  const clippedEnd = Math.min(endMin, gridEndMin);
  if (clippedEnd <= clippedStart) return null;

  const startSlot = Math.floor((clippedStart - gridStartMin) / SLOT_MINUTES);
  const span = Math.max(
    1,
    Math.ceil((clippedEnd - clippedStart) / SLOT_MINUTES),
  );
  return { startSlot, span };
}

/** สร้าง label เวลาสำหรับ header (08:00, 08:30, 09:00, ...) */
export function buildSlotLabels(): string[] {
  const labels: string[] = [];
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    const totalMin = DAY_START_HOUR * 60 + i * SLOT_MINUTES;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    labels.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return labels;
}

/**
 * แปลง slot index (0..SLOTS_PER_DAY-1) → เวลา "HH:MM:SS"
 * ใช้ตอนคำนวณ start_time จาก drop coordinate ใน grid
 */
export function slotToTime(slotIndex: number): string {
  const totalMin = DAY_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

/** บวก duration นาที + "HH:MM:SS" → คืน "HH:MM:SS" ใหม่ */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const total = timeToMinutes(timeStr) + minutes;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}
