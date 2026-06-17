-- เฟส 2 (เผื่อไว้ — ❗ยังไม่รัน prod จนกว่าจะมี UI ให้ครูกรอก
--   "รับสอนเดี่ยวไหม" + "วัน/เวลาที่ยินดีสอนเดี่ยว")
--
-- ออกแบบตามที่ซันจิ/แป้งคุยใน AGENT_CHAT_sanji-olaf:
--   ยกระดับ availability จาก confidence "calendar-free" → "tutor-confirmed"
--   โดย availability เฟส 2 จะกรอง AND กับ 2 ส่วนนี้ เพื่อตัด false offer
--   (ครูว่างในตารางคอร์สกลุ่ม แต่ไม่ได้ยินดีสอนเดี่ยวช่วงนั้น)
--
-- Safe to re-run (ADD COLUMN / CREATE TABLE IF NOT EXISTS).

-- (ก) ครูรับสอนเดี่ยวเพิ่มไหม — availability เฟส 2 จะกรองเฉพาะ true
alter table public.tutor_profiles
  add column if not exists accepts_new_private boolean not null default false;

-- (ข) วัน/เวลาที่ครู "ยินดีสอนเดี่ยว" (ต่างจากตารางคอร์สกลุ่มที่มีอยู่) —
--     availability เฟส 2 จะเสนอ slot เฉพาะที่ตกอยู่ใน window เหล่านี้เท่านั้น
create table if not exists public.tutor_availability_windows (
  id                uuid primary key default gen_random_uuid(),
  tutor_profile_id  uuid not null references public.tutor_profiles(id) on delete cascade,
  day_of_week       smallint not null check (day_of_week between 1 and 7),
  start_time        time not null,
  end_time          time not null,
  created_at        timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists tutor_availability_windows_tutor_idx
  on public.tutor_availability_windows (tutor_profile_id, day_of_week);
