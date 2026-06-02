-- ============================================================
-- Import v2 weekend — เพิ่ม วันเสาร์ + อาทิตย์
-- จาก CSV "วางแผนตาราง 68 ส-อา มงฟอร์ต"
-- รันต่อจาก seed_import_v2.sql (ใช้ tutor + room IDs เดิม)
-- ============================================================

-- cleanup ของเก่า (ถ้ารันซ้ำ)
delete from public.schedule_events where source_ref = 'sheet-import-v2-weekend';

-- ============================================================
-- เสาร์ (day=6)
-- ============================================================
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.5 A-level (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-1101-1101-1101-110000000001', 'onsite', 6, '13:00', '15:00', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.5 (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-1101-1101-1101-110000000001', 'onsite', 6, '15:30', '17:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.4 (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-1101-1101-1101-110000000001', 'onsite', 6, '17:30', '19:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เอิร์ธ ฟิสิกส์ (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000002', 'onsite', 6, '08:30', '10:00', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.3 (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000002', 'onsite', 6, '10:00', '11:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.5 เพิ่มเกรด (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000002', 'onsite', 6, '13:00', '15:00', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ กลุ่มน้องต้นกล้า (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000002', 'onsite', 6, '15:00', '16:30', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี น้องเบล (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-1101-1101-1101-110000000003', 'onsite', 6, '08:00', '09:30', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี EP (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-1101-1101-1101-110000000003', 'onsite', 6, '10:30', '12:00', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.5 A-level กลุ่ม 1 (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-1101-1101-1101-110000000003', 'onsite', 6, '17:30', '19:30', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต น้องแบ่งปัน (พี่ปอเช่)', 'a1000000-0000-0000-0000-000000000005', '33333333-1101-1101-1101-110000000004', 'onsite', 6, '10:00', '12:00', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต น้องเบล ม.1 (พี่ปอเช่)', 'a1000000-0000-0000-0000-000000000005', '33333333-1101-1101-1101-110000000004', 'onsite', 6, '12:30', '14:00', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต รักเอย (พี่ปอเช่)', 'a1000000-0000-0000-0000-000000000005', '33333333-1101-1101-1101-110000000004', 'onsite', 6, '14:30', '16:00', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'อังกฤษ ม.4 (พี่ออม)', 'a1000000-0000-0000-0000-000000000006', '33333333-1101-1101-1101-110000000005', 'onsite', 6, '13:00', '15:00', null, 'scheduled', '#93C5FD', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ น้องอั่งเปา (พี่ปอ)', 'a1000000-0000-0000-0000-000000000010', '33333333-1101-1101-1101-110000000006', 'onsite', 6, '12:30', '14:00', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี น้องอั่งเปา (พี่เบสท์)', null, '33333333-1101-1101-1101-110000000006', 'onsite', 6, '15:30', '17:00', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ โอลิมปิก #67 (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 6, '13:00', '15:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.5 A-level (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 6, '15:30', '17:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.4 A-level (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 6, '18:00', '20:00', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ น้องเป้ (พี่อิล)', 'a1000000-0000-0000-0000-000000000004', '33333333-2202-2202-2202-220000000002', 'onsite', 6, '13:00', '15:00', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี น้องรักเอย (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-2202-2202-2202-220000000004', 'onsite', 6, '13:00', '14:30', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'Gifted เคมี (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-2202-2202-2202-220000000004', 'onsite', 6, '14:30', '16:00', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;

-- ============================================================
-- อาทิตย์ (day=7)
-- ============================================================
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.4 A-level (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-1101-1101-1101-110000000001', 'onsite', 7, '13:00', '15:00', 11, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.5 A-level (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-1101-1101-1101-110000000001', 'onsite', 7, '15:30', '17:30', 11, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'เคมี บีม+เปเอฟ (พี่ปอง)', 'a1000000-0000-0000-0000-000000000001', '33333333-1101-1101-1101-110000000001', 'onsite', 7, '18:00', '19:30', null, 'scheduled', '#6EE7B7', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ (พี่บอส)', 'a1000000-0000-0000-0000-000000000013', '33333333-1101-1101-1101-110000000004', 'onsite', 7, '14:30', '16:00', null, 'scheduled', '#FCA5A5', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ น้องกรณ์ (พี่ถุงแป้ง)', 'a1000000-0000-0000-0000-000000000011', '33333333-1101-1101-1101-110000000004', 'onsite', 7, '16:30', '18:00', null, 'scheduled', '#FCA5A5', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต น้องบีม+เปเอฟ (พี่ปอเช่)', 'a1000000-0000-0000-0000-000000000005', '33333333-1101-1101-1101-110000000005', 'onsite', 7, '10:30', '12:00', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต บอส (พี่ปอเช่)', 'a1000000-0000-0000-0000-000000000005', '33333333-1101-1101-1101-110000000005', 'onsite', 7, '13:00', '15:00', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ น้องบีเอ็ม (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000006', 'onsite', 7, '08:00', '09:30', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ ชีมะ (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000006', 'onsite', 7, '09:30', '11:00', null, 'scheduled', '#FCA5A5', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ต้นกล้า (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000006', 'onsite', 7, '11:00', '12:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต วิณ (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000006', 'onsite', 7, '13:00', '14:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต น้องก้อง (ครูอ๊อด)', 'a1000000-0000-0000-0000-000000000003', '33333333-1101-1101-1101-110000000006', 'onsite', 7, '14:30', '16:00', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ น้องพราว (พี่ปอ)', 'a1000000-0000-0000-0000-000000000010', '33333333-1101-1101-1101-110000000006', 'onsite', 7, '16:00', '17:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ adv. #66 (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 7, '08:30', '10:30', 5, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.5 A-level (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 7, '10:30', '12:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.6 TCAS (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 7, '13:00', '15:30', 13, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.4 A-level (พี่นก)', 'a1000000-0000-0000-0000-000000000007', '33333333-2202-2202-2202-220000000001', 'onsite', 7, '15:30', '17:30', null, 'scheduled', '#86EFAC', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.4 A-level (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-2202-2202-2202-220000000002', 'onsite', 7, '10:00', '12:00', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.5 A-level (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-2202-2202-2202-220000000002', 'onsite', 7, '13:00', '15:00', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.6 A-level (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-2202-2202-2202-220000000002', 'onsite', 7, '15:30', '17:30', null, 'scheduled', '#A78BFA', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;
do $$ begin insert into public.schedule_events (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode, day_of_week, start_time, end_time, planned_student_count, status, color_hex, source_type, source_ref) values
('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.5 A-level (พี่ขลุ่ย)', 'a1000000-0000-0000-0000-000000000008', '33333333-2202-2202-2202-220000000002', 'onsite', 7, '18:00', '20:00', null, 'scheduled', '#FBBF24', 'import', 'sheet-import-v2-weekend');
exception when others then null; end $$;

-- ============================================================
-- ✅ Imported เสาร์ (~22 events) + อาทิตย์ (~21 events)
-- ============================================================
-- ถ้าอยาก undo:
-- delete from public.schedule_events where source_ref = 'sheet-import-v2-weekend';
