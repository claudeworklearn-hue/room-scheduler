-- ============================================================
-- Import v2 — จาก CSV "วางแผนตาราง 68 จ-ศ มงฟอร์ต"
-- 5 วัน (จันทร์–ศุกร์) — มี room mapping จริง (ไม่ใช่ online row อีกแล้ว)
-- ============================================================

-- Step 0: cleanup ของเก่า (ถ้ามี)
delete from public.schedule_events where source_ref like 'sheet-import%';
delete from public.tutor_profiles where short_code in
  ('NOK','KLY','PCH','AOD','PNG','TPN','MND','PAI','ILL','OOM','POR','GRT','BOS','PPN','PDT');

-- ============================================================
-- 1. ครู — insert ทั้งหมดที่จำเป็น (15 คน)
-- ============================================================
insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, color_hex, active) values
  ('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ครูปอง',    'PNG', '#6EE7B7', true),
  ('a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'ครูปาย',    'PAI', '#93C5FD', true),
  ('a1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'ครูอ๊อด',   'AOD', '#FBBF24', true),
  ('a1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'ครูอิล',    'ILL', '#A78BFA', true),
  ('a1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'ครูปอเช่',  'PCH', '#C4B5FD', true),
  ('a1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'ครูออม',    'OOM', '#93C5FD', true),
  ('a1000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'ครูนก',     'NOK', '#86EFAC', true),
  ('a1000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'ครูขลุ่ย',  'KLY', '#FBBF24', true),
  ('a1000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'ครูมายด์',  'MND', '#86EFAC', true),
  ('a1000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'ครูปอ',     'POR', '#86EFAC', true),
  ('a1000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'ครูถุงแป้ง','TPN', '#FCA5A5', true),
  ('a1000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'ครูเกรท',   'GRT', '#6EE7B7', true),
  ('a1000000-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', 'ครูบอส',    'BOS', '#A78BFA', true),
  ('a1000000-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', 'ครูป้อปั้น','PPN', '#86EFAC', true),
  ('a1000000-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', 'ครูผัดไท',  'PDT', '#86EFAC', true)
on conflict (id) do nothing;

-- ============================================================
-- 2. Events — ลงห้องจริง + delivery_mode=onsite (online เฉพาะ "ONLINE")
-- ใช้ DO block ทุก insert → ถ้า conflict (ห้องชน/ครูชน) จะข้ามตัวนั้นแล้วทำต่อ
-- ============================================================

-- ทำให้ INSERT ง่ายขึ้น: function ช่วย insert event
do $$
declare
  -- room ids (จาก seed.sql)
  r_A     uuid := '33333333-1101-1101-1101-110000000001';
  r_D     uuid := '33333333-1101-1101-1101-110000000002';
  r_G     uuid := '33333333-1101-1101-1101-110000000003';
  r_OL    uuid := '33333333-1101-1101-1101-110000000004';
  r_E     uuid := '33333333-1101-1101-1101-110000000005';
  r_N     uuid := '33333333-1101-1101-1101-110000000006';
  r_NA    uuid := '33333333-2202-2202-2202-220000000001';  -- หน้า
  r_LA    uuid := '33333333-2202-2202-2202-220000000002';  -- หลัง
  r_BU    uuid := '33333333-2202-2202-2202-220000000003';  -- บนใหญ่
  r_BL    uuid := '33333333-2202-2202-2202-220000000004';  -- บนเล็ก
  -- tutor ids
  t_PNG uuid := 'a1000000-0000-0000-0000-000000000001';
  t_PAI uuid := 'a1000000-0000-0000-0000-000000000002';
  t_AOD uuid := 'a1000000-0000-0000-0000-000000000003';
  t_ILL uuid := 'a1000000-0000-0000-0000-000000000004';
  t_PCH uuid := 'a1000000-0000-0000-0000-000000000005';
  t_OOM uuid := 'a1000000-0000-0000-0000-000000000006';
  t_NOK uuid := 'a1000000-0000-0000-0000-000000000007';
  t_KLY uuid := 'a1000000-0000-0000-0000-000000000008';
  t_MND uuid := 'a1000000-0000-0000-0000-000000000009';
  t_POR uuid := 'a1000000-0000-0000-0000-000000000010';
  t_TPN uuid := 'a1000000-0000-0000-0000-000000000011';
  t_GRT uuid := 'a1000000-0000-0000-0000-000000000012';
  t_BOS uuid := 'a1000000-0000-0000-0000-000000000013';
  t_PPN uuid := 'a1000000-0000-0000-0000-000000000014';
  t_PDT uuid := 'a1000000-0000-0000-0000-000000000015';
  branch uuid := '11111111-1111-1111-1111-111111111111';

  -- helper local function via begin/exception per insert
  ok int;
begin
  -- เก็บไว้ใน array (room_id, tutor_id, dow, start, end, title, count, color, mode)
  -- ใช้ exception handling per row
  null;
end $$;

-- เนื่องจาก plpgsql ใน DO ไม่สะดวกที่จะ loop แล้ว exception per row
-- ใช้แบบ DO block ต่อ INSERT แทน

-- ============================================================
-- จันทร์ (day=1)
-- ============================================================
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.4', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000001', 'onsite', 1, '17:30', '19:30', 13, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต น้องใจ่ใจ๋', null, '33333333-1101-1101-1101-110000000002', 'onsite', 1, '17:30', '19:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ ม.1', null, '33333333-1101-1101-1101-110000000003', 'onsite', 1, '17:30', '19:30', null, 'scheduled', '#FCA5A5', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'บีเวอร์ (พี่บอส)', 'a1000000-0000-0000-0000-000000000013', '33333333-1101-1101-1101-110000000004', 'onsite', 1, '17:00', '18:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.4 เพิ่มเกรด ม.5 (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-1101-1101-1101-110000000005', 'onsite', 1, '17:30', '19:30', 8, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ (ป้อปั้น)', 'a1000000-0000-0000-0000-000000000014', '33333333-1101-1101-1101-110000000006', 'onsite', 1, '17:00', '18:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.2 #69 (พี่ปอเช่)', 'a1000000-0000-0000-0000-000000000005', '33333333-2202-2202-2202-220000000001', 'onsite', 1, '17:30', '19:30', 19, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.4 (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-2202-2202-2202-220000000002', 'onsite', 1, '17:30', '19:30', 8, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี แฮปปี้ (เกรท)', 'a1000000-0000-0000-0000-000000000012', '33333333-2202-2202-2202-220000000004', 'onsite', 1, '17:00', '18:30', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี น้องข้าวโพด (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', null, 'online', 1, '20:30', '21:30', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', '#เดี่ยว คณิต น้องพัตเตอร์ ม.3 (พี่ปอเช่)', 'a1000000-0000-0000-0000-000000000005', null, 'online', 1, '17:00', '18:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;

-- ============================================================
-- อังคาร (day=2)
-- ============================================================
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี A-level ม.5 (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-1101-1101-1101-110000000001', 'onsite', 2, '17:30', '19:30', 11, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ภาษาอังกฤษ (พี่ปาย)', 'a1000000-0000-0000-0000-000000000002', '33333333-1101-1101-1101-110000000002', 'onsite', 2, '17:30', '19:30', null, 'scheduled', '#93C5FD', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.6 A-level (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000003', 'onsite', 2, '17:30', '19:30', 20, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.1 (พี่อิล)', 'a1000000-0000-0000-0000-000000000004', '33333333-1101-1101-1101-110000000004', 'onsite', 2, '17:30', '19:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.4 เพิ่มเกรด (พี่ปอเช่)', 'a1000000-0000-0000-0000-000000000005', '33333333-1101-1101-1101-110000000005', 'onsite', 2, '17:30', '19:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'อังกฤษ สามสาว (พี่ออม)', 'a1000000-0000-0000-0000-000000000006', '33333333-1101-1101-1101-110000000006', 'onsite', 2, '17:30', '19:30', null, 'scheduled', '#93C5FD', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ เพิ่มเกรด ม.4 (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 2, '17:30', '19:30', 19, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.6 A-level (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-2202-2202-2202-220000000002', 'onsite', 2, '17:30', '19:30', 20, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ EP', null, '33333333-2202-2202-2202-220000000003', 'onsite', 2, '17:30', '19:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'น้องโบนัส (พี่บอส)', 'a1000000-0000-0000-0000-000000000013', '33333333-2202-2202-2202-220000000004', 'onsite', 2, '17:30', '19:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ เรยีนา/น้องปีใหม่ (พี่มายด์)', 'a1000000-0000-0000-0000-000000000009', null, 'online', 2, '18:00', '20:00', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;

-- ============================================================
-- พุธ (day=3)
-- ============================================================
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต น้องใบเตย', null, '33333333-1101-1101-1101-110000000001', 'onsite', 3, '15:00', '16:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต เพิ่มเกรด ม.5', null, '33333333-1101-1101-1101-110000000001', 'onsite', 3, '18:00', '19:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'อังกฤษ สามสาว (พี่ออม)', 'a1000000-0000-0000-0000-000000000006', '33333333-1101-1101-1101-110000000002', 'onsite', 3, '17:00', '19:00', null, 'scheduled', '#93C5FD', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ภาษาอังกฤษ ม.2', null, '33333333-1101-1101-1101-110000000003', 'onsite', 3, '16:30', '18:00', null, 'scheduled', '#93C5FD', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต น้องแอดมิน (พี่อิล)', 'a1000000-0000-0000-0000-000000000004', '33333333-1101-1101-1101-110000000004', 'onsite', 3, '17:00', '18:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ รักเอย+เอ็นไซต์ (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000005', 'onsite', 3, '15:30', '17:00', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี น้องพิงกี้ (พี่เกรท)', 'a1000000-0000-0000-0000-000000000012', '33333333-1101-1101-1101-110000000006', 'onsite', 3, '15:00', '16:30', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ Gifted P.2 (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 3, '16:00', '17:30', 13, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.4 เพิ่มเกรด (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-2202-2202-2202-220000000001', 'onsite', 3, '17:30', '19:30', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'Gifted ฟิสิกส์', null, '33333333-2202-2202-2202-220000000002', 'onsite', 3, '16:00', '17:30', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.4 (ครูขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-2202-2202-2202-220000000002', 'onsite', 3, '17:30', '19:30', 8, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;

-- ============================================================
-- พฤหัสบดี (day=4)
-- ============================================================
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ ม.3 (พี่ถุงแป้ง)', 'a1000000-0000-0000-0000-000000000011', '33333333-1101-1101-1101-110000000001', 'onsite', 4, '17:30', '19:30', null, 'scheduled', '#FCA5A5', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ภาษาอังกฤษ ม.5 (ครูออม)', 'a1000000-0000-0000-0000-000000000006', '33333333-1101-1101-1101-110000000002', 'onsite', 4, '17:30', '19:30', null, 'scheduled', '#93C5FD', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.1 (ครูปอเช่)', 'a1000000-0000-0000-0000-000000000005', '33333333-1101-1101-1101-110000000003', 'onsite', 4, '17:30', '19:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ น้องภู (พี่อิล)', 'a1000000-0000-0000-0000-000000000004', '33333333-1101-1101-1101-110000000004', 'onsite', 4, '17:30', '19:30', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.4 (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-1101-1101-1101-110000000005', 'onsite', 4, '17:30', '19:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ น้องบีเวอร์', null, '33333333-1101-1101-1101-110000000006', 'onsite', 4, '17:30', '19:30', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.4 เพิ่มเกรด (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 4, '17:30', '19:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.6 A-level (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-2202-2202-2202-220000000002', 'onsite', 4, '17:30', '19:30', 30, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี 4 คน น้องโบว์ เอย ปั้นหยา', null, '33333333-2202-2202-2202-220000000003', 'onsite', 4, '17:30', '19:30', 4, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ น้องแอดมิน (พี่ปอ)', 'a1000000-0000-0000-0000-000000000010', '33333333-2202-2202-2202-220000000004', 'onsite', 4, '17:00', '18:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.5 น้องมุก (พี่ผัดไท)', 'a1000000-0000-0000-0000-000000000015', null, 'online', 4, '18:00', '19:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;

-- ============================================================
-- ศุกร์ (day=5)
-- ============================================================
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ ม.2 (พี่ถุงแป้ง)', 'a1000000-0000-0000-0000-000000000011', '33333333-1101-1101-1101-110000000001', 'onsite', 5, '17:30', '19:30', 19, 'scheduled', '#FCA5A5', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ เพิ่มเกรด ม.5 (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000002', 'onsite', 5, '17:30', '19:30', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.5 A-level (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-1101-1101-1101-110000000003', 'onsite', 5, '17:30', '19:30', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ EP (พี่อิล)', 'a1000000-0000-0000-0000-000000000004', '33333333-1101-1101-1101-110000000004', 'onsite', 5, '17:30', '19:30', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.4 A-level (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-1101-1101-1101-110000000005', 'onsite', 5, '17:30', '19:30', 6, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.6 (พี่ปอ)', 'a1000000-0000-0000-0000-000000000010', '33333333-1101-1101-1101-110000000006', 'onsite', 5, '16:30', '17:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.2 น้องโบนัส (พี่บอส)', 'a1000000-0000-0000-0000-000000000013', '33333333-1101-1101-1101-110000000006', 'onsite', 5, '17:30', '19:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.6 (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 5, '17:30', '19:30', 28, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิตกลุ่ม ม.3 (พี่ปอเช่)', 'a1000000-0000-0000-0000-000000000005', '33333333-2202-2202-2202-220000000002', 'onsite', 5, '17:30', '19:30', 21, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ภาษาอังกฤษ ม.1', null, '33333333-2202-2202-2202-220000000003', 'onsite', 5, '17:30', '19:30', null, 'scheduled', '#93C5FD', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ภาษาอังกฤษ ม.4', null, '33333333-2202-2202-2202-220000000004', 'onsite', 5, '17:30', '19:30', null, 'scheduled', '#93C5FD', 'import', 'sheet-import-v2');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ A-level 3 คน (พี่ปอ)', 'a1000000-0000-0000-0000-000000000010', null, 'online', 5, '17:00', '18:30', 3, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2');
exception when others then null; end $$;

-- ============================================================
-- ✅ เสร็จ — ~50 events ลงห้องจริงแล้ว
-- ============================================================
-- ถ้าอยาก undo: uncomment 2 บรรทัดล่าง
-- delete from public.schedule_events where source_ref = 'sheet-import-v2';
-- delete from public.tutor_profiles where short_code in ('NOK','KLY','PCH','AOD','PNG','TPN','MND','PAI','ILL','OOM','POR','GRT','BOS','PPN','PDT');
