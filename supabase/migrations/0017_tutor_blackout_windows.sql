-- Room Scheduler — tutor_blackout_windows
-- รันหลัง 0016_booking_requests.sql
--
-- ช่วงเวลาที่ครู "ไม่รับสอน" รายสัปดาห์ (day_of_week + เวลาเริ่ม-จบ)
-- ต่างจาก closed_days_for_new (ปิด "ทั้งวัน"): อันนี้ปิด "บางช่วงเวลา"
-- availability จะตัดช่วงเหล่านี้ออก (เหมือนมีคาบกั้น) เพิ่มจาก closed_days + คอร์สกลุ่ม
-- Safe to re-run.

create table if not exists public.tutor_blackout_windows (
  id                uuid primary key default gen_random_uuid(),
  tutor_profile_id  uuid not null references public.tutor_profiles(id) on delete cascade,
  day_of_week       smallint not null check (day_of_week between 1 and 7),
  start_time        time not null,
  end_time          time not null,
  reason            varchar(120),
  created_at        timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists tutor_blackout_windows_tutor_idx
  on public.tutor_blackout_windows (tutor_profile_id, day_of_week);
