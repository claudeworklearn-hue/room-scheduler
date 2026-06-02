-- Room Scheduler — disable RLS สำหรับ dev/MVP
-- รันหลัง 0005_pending_student_names.sql
--
-- เหตุผล:
--   - ตอนนี้ยังไม่มี auth → ทุก query ผ่าน anon key
--   - Supabase อาจเปิด RLS อัตโนมัติให้ table ใหม่ → write ไม่ได้
--   - เปิด RLS โดยไม่มี policy = block ทุก operation
--
-- ⚠️ ตอนเปิด auth จริง:
--   1. เปิด RLS กลับใน table ทั้งหมด: alter table ... enable row level security;
--   2. เขียน policy ตาม role (admin/tutor/anon) ตาม spec ใน deep-research-report

alter table public.branches         disable row level security;
alter table public.rooms            disable row level security;
alter table public.tutor_profiles   disable row level security;
alter table public.courses          disable row level security;
alter table public.schedule_events  disable row level security;
alter table public.pending_bookings disable row level security;
alter table public.import_runs     disable row level security;
alter table public.import_rows     disable row level security;

-- (ถ้า table ไหนไม่มี RLS เปิดอยู่ disable ซ้ำก็ไม่ error)
