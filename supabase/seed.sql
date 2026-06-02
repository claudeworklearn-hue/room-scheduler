-- Room Scheduler — seed data (updated with real building/room structure)
-- รันหลัง 0001_init.sql + 0002_constraints.sql + 0007_rooms_building.sql

-- เคลียร์ก่อน (ตามลำดับ FK)
truncate table public.schedule_events restart identity cascade;
truncate table public.import_rows restart identity cascade;
truncate table public.import_runs restart identity cascade;
truncate table public.courses restart identity cascade;
truncate table public.rooms restart identity cascade;
truncate table public.tutor_profiles restart identity cascade;
truncate table public.branches restart identity cascade;

-- ---------------------------------------------------------
-- branches
-- ---------------------------------------------------------
insert into public.branches (id, slug, name_th, name_en, timezone) values
  ('11111111-1111-1111-1111-111111111111', 'CNX', 'สาขาเชียงใหม่', 'Chiang Mai', 'Asia/Bangkok');

-- ---------------------------------------------------------
-- tutor_profiles
-- ---------------------------------------------------------
insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, color_hex) values
  ('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'ครูเมย์',  'MAY', '#F3D54E'),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'ครูบอย',  'BOY', '#9BD0F5'),
  ('22222222-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'ครูนิม',  'NIM', '#C4B5FD');

-- ---------------------------------------------------------
-- rooms (10 ห้องจริง — ตึกหลัก 6 + ตึก med 4)
-- ---------------------------------------------------------
-- ตึกหลัก
insert into public.rooms (id, branch_id, building, code, name_th, capacity, room_type, sort_order) values
  ('33333333-1101-1101-1101-110000000001', '11111111-1111-1111-1111-111111111111', 'ตึกหลัก', 'A',  'ห้อง A',  24, 'classroom', 10),
  ('33333333-1101-1101-1101-110000000002', '11111111-1111-1111-1111-111111111111', 'ตึกหลัก', 'D',  'ห้อง D',  15, 'classroom', 20),
  ('33333333-1101-1101-1101-110000000003', '11111111-1111-1111-1111-111111111111', 'ตึกหลัก', 'G',  'ห้อง G',  18, 'classroom', 30),
  ('33333333-1101-1101-1101-110000000004', '11111111-1111-1111-1111-111111111111', 'ตึกหลัก', 'OL', 'ห้อง OL',  6, 'meeting',   40),
  ('33333333-1101-1101-1101-110000000005', '11111111-1111-1111-1111-111111111111', 'ตึกหลัก', 'E',  'ห้อง E',  15, 'classroom', 50),
  ('33333333-1101-1101-1101-110000000006', '11111111-1111-1111-1111-111111111111', 'ตึกหลัก', 'N',  'ห้อง N',   6, 'meeting',   60);

-- ตึก med
insert into public.rooms (id, branch_id, building, code, name_th, capacity, room_type, sort_order) values
  ('33333333-2202-2202-2202-220000000001', '11111111-1111-1111-1111-111111111111', 'ตึก med', 'หน้า',   'ห้องหน้า (ตึก med)',   55, 'classroom', 110),
  ('33333333-2202-2202-2202-220000000002', '11111111-1111-1111-1111-111111111111', 'ตึก med', 'หลัง',   'ห้องหลัง (ตึก med)',   20, 'classroom', 120),
  ('33333333-2202-2202-2202-220000000003', '11111111-1111-1111-1111-111111111111', 'ตึก med', 'บนใหญ่', 'ห้องบนใหญ่ (ตึก med)', 25, 'classroom', 130),
  ('33333333-2202-2202-2202-220000000004', '11111111-1111-1111-1111-111111111111', 'ตึก med', 'บนเล็ก', 'ห้องบนเล็ก (ตึก med)', 12, 'classroom', 140);

-- ---------------------------------------------------------
-- courses
-- ---------------------------------------------------------
insert into public.courses (id, branch_id, course_code, title_th, subject, default_color_hex) values
  ('44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'PHYS-M4', 'ฟิสิกส์ ม.4', 'physics',   '#F3D54E'),
  ('44444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'CHEM-M1', 'เคมี ม.1',  'chemistry', '#9BD0F5'),
  ('44444444-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'ENG-M3',  'อังกฤษ ม.3', 'english',  '#C4B5FD');

-- ---------------------------------------------------------
-- schedule_events — template recurring weekly
-- day_of_week: 1=จันทร์, 2=อังคาร, 3=พุธ, 4=พฤหัสบดี, 5=ศุกร์, 6=เสาร์, 7=อาทิตย์
-- ---------------------------------------------------------

-- ทุกจันทร์ 17:30-19:30 ห้อง A ฟิสิกส์ ม.4 ครูเมย์
insert into public.schedule_events
  (branch_id, event_type, title_th, course_id, tutor_profile_id, room_id,
   delivery_mode, day_of_week, start_time, end_time,
   planned_student_count, status, color_hex, source_type)
values
  ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.4',
   '44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '33333333-1101-1101-1101-110000000001',  -- A
   'onsite', 1, '17:30:00', '19:30:00',
   19, 'scheduled', '#F3D54E', 'manual');

-- ทุกจันทร์ 17:30-19:30 ห้อง D เคมี ม.1 ครูบอย
insert into public.schedule_events
  (branch_id, event_type, title_th, course_id, tutor_profile_id, room_id,
   delivery_mode, day_of_week, start_time, end_time,
   planned_student_count, status, color_hex, source_type)
values
  ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.1',
   '44444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '33333333-1101-1101-1101-110000000002',  -- D
   'onsite', 1, '17:30:00', '19:30:00',
   10, 'scheduled', '#9BD0F5', 'manual');

-- ทุกจันทร์ 19:30-21:00 ห้องหน้า (ตึก med) ฟิสิกส์ ม.4 กลุ่มใหญ่ ครูเมย์
insert into public.schedule_events
  (branch_id, event_type, title_th, course_id, tutor_profile_id, room_id,
   delivery_mode, day_of_week, start_time, end_time,
   planned_student_count, status, color_hex, source_type)
values
  ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.4 (กลุ่มใหญ่)',
   '44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '33333333-2202-2202-2202-220000000001',  -- หน้า (med)
   'onsite', 1, '19:30:00', '21:00:00',
   45, 'scheduled', '#F3D54E', 'manual');

-- ทุกอังคาร 18:00-19:30 online อังกฤษ ม.3 ครูนิม
insert into public.schedule_events
  (branch_id, event_type, title_th, course_id, tutor_profile_id, room_id,
   delivery_mode, day_of_week, start_time, end_time,
   planned_student_count, status, color_hex, source_type)
values
  ('11111111-1111-1111-1111-111111111111', 'class', 'อังกฤษ ม.3 (ออนไลน์)',
   '44444444-cccc-cccc-cccc-cccccccccccc',
   '22222222-cccc-cccc-cccc-cccccccccccc',
   null,
   'online', 2, '18:00:00', '19:30:00',
   12, 'scheduled', '#C4B5FD', 'manual');

-- ทุกอังคาร 19:30-20:30 ห้อง G ปิดทำความสะอาด
insert into public.schedule_events
  (branch_id, event_type, title_th, room_id,
   day_of_week, start_time, end_time,
   status, color_hex, source_type, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'room_block', 'ปิดห้องเพื่อทำความสะอาด',
   '33333333-1101-1101-1101-110000000003',  -- G
   2, '19:30:00', '20:30:00',
   'scheduled', '#D9D9D9', 'manual', 'แม่บ้านเข้าทำความสะอาดประจำสัปดาห์');

-- ทุกพุธ 17:00-18:30 ห้อง D เคมี ม.1 ครูบอย
insert into public.schedule_events
  (branch_id, event_type, title_th, course_id, tutor_profile_id, room_id,
   delivery_mode, day_of_week, start_time, end_time,
   planned_student_count, status, color_hex, source_type)
values
  ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.1 (รอบพุธ)',
   '44444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '33333333-1101-1101-1101-110000000002',  -- D
   'onsite', 3, '17:00:00', '18:30:00',
   8, 'scheduled', '#9BD0F5', 'manual');

-- ทุกเสาร์ 09:00-12:00 ห้อง หน้า (ตึก med) ฟิสิกส์ ม.4 ครูเมย์ (เสาร์เช้า)
insert into public.schedule_events
  (branch_id, event_type, title_th, course_id, tutor_profile_id, room_id,
   delivery_mode, day_of_week, start_time, end_time,
   planned_student_count, status, color_hex, source_type)
values
  ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.4 (เสาร์เช้า)',
   '44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '33333333-2202-2202-2202-220000000001',  -- หน้า (med)
   'onsite', 6, '09:00:00', '12:00:00',
   40, 'scheduled', '#F3D54E', 'manual');
