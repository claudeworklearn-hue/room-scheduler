-- Seed สำหรับ pending_bookings (waiting list)
-- รันแยกหลัง 0003_pending_bookings.sql + 0004_pending_class_code.sql + seed.sql
-- ปลอดภัยรันซ้ำ (ลบของเก่าใน status pending ก่อน)
--
-- class_code จะถูก generate อัตโนมัติโดย trigger
-- (PV69M40001, PV69M50001, PV69M60001, PV69M30001 ตามลำดับด้านล่าง)

delete from public.pending_bookings where status = 'pending';

insert into public.pending_bookings
  (branch_id, course_id, tutor_profile_id, title_th,
   code_prefix, grade_level,
   duration_minutes, planned_student_count, delivery_mode, color_hex, notes,
   student_names)
values
  -- deal 1: Private ม.5 ฟิสิกส์ ครูเมย์ 2 ชม. 15 คน
  ('11111111-1111-1111-1111-111111111111',
   null, '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'ฟิสิกส์ ม.5 (รุ่นพิเศษ)',
   'PV', 'M5',
   120, 15, 'onsite', '#FFB84D',
   'ดีลกับผู้ปกครองวันที่ 18 พ.ค. — เริ่มได้หลังกลางเดือน มิ.ย.',
   '["น้องเอิร์ธ","น้องพีพี","น้องไอซ์"]'::jsonb),

  -- deal 2: Private ม.6 เคมี ครูบอย 1.5 ชม. 8 คน
  ('11111111-1111-1111-1111-111111111111',
   null, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'เคมี ม.6 (เตรียมสอบเข้า)',
   'PV', 'M6',
   90, 8, 'onsite', '#6EE7B7',
   'กลุ่มเล็ก เน้นทำข้อสอบเก่า',
   '["น้องบีม","น้องแอม"]'::jsonb),

  -- deal 3: Private ม.4 อังกฤษ online ครูนิม 1 ชม. 20 คน
  ('11111111-1111-1111-1111-111111111111',
   null, '22222222-cccc-cccc-cccc-cccccccccccc',
   'ภาษาอังกฤษ ม.4 ออนไลน์',
   'PV', 'M4',
   60, 20, 'online', '#A78BFA',
   'ยังไม่ได้กำหนดวัน ขอเสาร์-อาทิตย์',
   '["น้องมิ้น"]'::jsonb),

  -- deal 4: Private ม.3 คณิต ยังไม่เลือกครู (ยังไม่ระบุชื่อนักเรียน)
  ('11111111-1111-1111-1111-111111111111',
   null, null,
   'คณิต ม.3 (รอจัดครู)',
   'PV', 'M3',
   90, 12, 'onsite', '#F472B6',
   'รอประเมินว่าจะใช้ครูคนไหน',
   '[]'::jsonb),

  -- deal 5: Private ม.4 อีกคลาส — เพื่อทดสอบลำดับ (จะได้ PV69M40002)
  ('11111111-1111-1111-1111-111111111111',
   null, '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'ฟิสิกส์ ม.4 (รอบเย็น)',
   'PV', 'M4',
   120, 10, 'onsite', '#FBBF24',
   'เสริม นอกตารางหลัก',
   '["น้องนิว","น้องเก้า","น้องนน"]'::jsonb);
