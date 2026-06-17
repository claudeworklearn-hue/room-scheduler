-- Room Scheduler — booking_requests (คำขอจองเรียนเดี่ยวจากผู้ปกครอง ผ่านเว็บ /book + LINE)
-- รันหลัง 0015_tutor_private_availability.sql
--
-- หลักคิด:
--   - 1 row = 1 "คำขอจอง" ที่ ผปค เลือก slot ว่าง (จาก /api/availability) แล้วส่งมา
--   - status เริ่ม 'pending' เสมอ → แอดมิน/ครู "ยืนยัน" ก่อนถึงจะปิดดีล (ไม่ auto-confirm)
--   - line_user_id มาจาก LIFF getProfile() เท่านั้น (frontend) — ❌ ห้ามรับจาก URL param
--     (เคยทำให้ id ลูกค้าหลุดข้ามคน — ดู knowledge-academy-brain project_liff_userid_capture)
--   - ⚠️ มี PII (ชื่อ/เบอร์/line_user_id) → อยู่ใน scope RLS hardening (ยังไม่เปิด RLS)

create table if not exists public.booking_requests (
  id                uuid primary key default gen_random_uuid(),
  branch_id         uuid references public.branches(id) on delete set null,

  -- สิ่งที่ขอเรียน
  subject           varchar(32) not null,          -- subject key (physics/chem/…)
  grade_level       varchar(8),                    -- ม.4 ฯลฯ (optional)
  duration_minutes  smallint not null check (duration_minutes between 30 and 480),

  -- slot ที่ ผปค เลือก (จาก availability — ยัง tentative)
  tutor_profile_id  uuid references public.tutor_profiles(id) on delete set null,
  tutor_name        varchar(120),                  -- snapshot ชื่อครูตอนเลือก (เผื่อครูเปลี่ยน)
  day_of_week       smallint not null check (day_of_week between 1 and 7),
  start_time        time not null,
  end_time          time not null,
  room_id           uuid references public.rooms(id) on delete set null,

  -- ผู้ติดต่อ (PII)
  contact_name      varchar(120) not null,
  contact_phone     varchar(32),
  student_name      varchar(120),
  line_user_id      varchar(64),                   -- จาก LIFF getProfile() เท่านั้น

  note              text,
  status            varchar(16) not null default 'pending'
                     check (status in ('pending','confirmed','rejected','cancelled')),
  reviewed_by       varchar(120),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists booking_requests_status_idx
  on public.booking_requests (status, created_at desc);

-- updated_at trigger (ใช้ฟังก์ชัน set_updated_at ที่ประกาศไว้แล้วใน 0001/0003)
drop trigger if exists trg_booking_requests_updated_at on public.booking_requests;
create trigger trg_booking_requests_updated_at
  before update on public.booking_requests
  for each row execute function public.set_updated_at();
