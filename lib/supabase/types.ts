// Database types สำหรับ Supabase
// (สามารถ regenerate ด้วย: npx supabase gen types typescript --linked > lib/supabase/types.generated.ts)
// ตอนนี้กำหนด type หลัก ๆ ที่ใช้บ่อยไว้ให้พอใช้งานในรอบ MVP

export type EventType = "class" | "room_block";
export type DeliveryMode = "onsite" | "online" | "hybrid";
export type EventStatus = "draft" | "scheduled" | "cancelled";
export type RoomType = "classroom" | "lab" | "meeting" | "studio" | "other";

export type Branch = {
  id: string;
  slug: string;
  name_th: string;
  name_en: string | null;
  timezone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  branch_id: string;
  building: string | null;       // เช่น "ตึกหลัก", "ตึก med"
  code: string;
  name_th: string;
  name_en: string | null;
  capacity: number;
  room_type: RoomType;
  equipment: unknown;
  location_note: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type TutorProfile = {
  id: string;
  user_id: string | null;
  branch_id: string | null;
  display_name_th: string;
  display_name_en: string | null;
  short_code: string;
  color_hex: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Course = {
  id: string;
  branch_id: string | null;
  course_code: string;
  title_th: string;
  title_en: string | null;
  subject: string | null;
  default_color_hex: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PendingBookingStatus = "pending" | "scheduled" | "cancelled";

/**
 * grade_level — ใช้ระบบไทย: P1-P6 (ประถม 1-6), M1-M6 (มัธยม 1-6)
 * + ETC สำหรับนอกระบบ (มหาวิทยาลัย, ครู, อื่น ๆ)
 */
export type GradeLevel =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6"
  | "M1" | "M2" | "M3" | "M4" | "M5" | "M6"
  | "ETC";

/**
 * code_prefix — ปัจจุบันมีแค่ PV (Private)
 * เผื่อขยายในอนาคต: GR (Group), CM (Camp), IN (Intensive)
 */
export type CodePrefix = "PV" | "GR" | "CM" | "IN";

export type PendingBooking = {
  id: string;
  branch_id: string;
  course_id: string | null;
  tutor_profile_id: string | null;
  title_th: string;
  code_prefix: CodePrefix;
  grade_level: GradeLevel;
  class_code: string; // เช่น "PV69M40001" — generate โดย DB trigger
  student_names: string[]; // ชื่อเล่น/ชื่อจริงของนักเรียนในคลาส (สำหรับ private course)
  duration_minutes: number;
  planned_student_count: number | null;
  delivery_mode: DeliveryMode;
  color_hex: string | null;
  notes: string | null;
  status: PendingBookingStatus;
  scheduled_event_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

/** ISO weekday: 1=จันทร์, 2=อังคาร, 3=พุธ, 4=พฤหัสบดี, 5=ศุกร์, 6=เสาร์, 7=อาทิตย์ */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Schedule event = template ที่ repeat ทุกสัปดาห์
 * ไม่มีวันที่จริง — มีเพียง day_of_week + start_time + end_time
 */
export type ScheduleEvent = {
  id: string;
  branch_id: string;
  event_type: EventType;
  title_th: string;
  course_id: string | null;
  tutor_profile_id: string | null;
  room_id: string | null;
  delivery_mode: DeliveryMode | null;
  day_of_week: DayOfWeek;
  start_time: string; // "HH:MM:SS"
  end_time: string;   // "HH:MM:SS"
  planned_student_count: number | null;
  status: EventStatus;
  color_hex: string | null;
  source_type: "manual" | "import" | "api";
  source_ref: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};
