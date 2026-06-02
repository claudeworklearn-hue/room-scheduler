-- Auto-generated import SQL จาก Google Sheet ของพี่
-- รันใน Supabase SQL Editor (paste ทั้งไฟล์ → Run)
--
-- หลังรัน:
--   - tutor_profiles + 7 ครูใหม่
--   - schedule_events + 75 คลาส (delivery_mode='online' default — ยังไม่ระบุห้อง)
--   - พี่ต้องไป edit/ลาก แต่ละ event ไปห้องที่ถูกต้องเอง (รอ edit feature)


-- ============================================================
-- 1. ครูใหม่ 7 คน
-- ============================================================
insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, active)
values ('38abf6b2-8294-40ac-9162-3b9e8d1b8a99', '11111111-1111-1111-1111-111111111111', 'ครูนก', 'NOK', true)
on conflict (id) do nothing;
insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, active)
values ('a940526b-786a-4f48-91f6-a244d4368514', '11111111-1111-1111-1111-111111111111', 'ครูขลุ่ย', 'KLY', true)
on conflict (id) do nothing;
insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, active)
values ('78c0c1eb-9857-4d0e-b738-81d413d645cf', '11111111-1111-1111-1111-111111111111', 'ครูปอเช่', 'PCH', true)
on conflict (id) do nothing;
insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, active)
values ('08241a5e-e456-4b3d-9092-47f17826e64d', '11111111-1111-1111-1111-111111111111', 'ครูอ๊อด', 'AOD', true)
on conflict (id) do nothing;
insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, active)
values ('76630570-ad15-40fa-853c-dcc92ee55115', '11111111-1111-1111-1111-111111111111', 'ครูปอง', 'PNG', true)
on conflict (id) do nothing;
insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, active)
values ('8d9386cc-6acc-4d5d-bfdf-ba9039290ae0', '11111111-1111-1111-1111-111111111111', 'ครูถุงแป้ง', 'TPN', true)
on conflict (id) do nothing;
insert into public.tutor_profiles (id, branch_id, display_name_th, short_code, active)
values ('ccf47958-6457-4fe8-9d5b-ab39ecd89bdc', '11111111-1111-1111-1111-111111111111', 'ครูมายด์', 'MND', true)
on conflict (id) do nothing;

-- ============================================================
-- 2. ตารางคลาส 75 รายการ
--    หมายเหตุ: delivery_mode='online' default เพราะ sheet ไม่ระบุห้อง
--    หลัง import พี่ไป edit แต่ละ event เพื่อย้ายไปห้องที่ถูก
-- ============================================================
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.5 เพิ่มเกรด 17.30 - 19.30 น.', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          2, '17:30:00', '19:30:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'BIO Gifted (พี่นก) 16.00-17.30', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          3, '16:00:00', '17:30:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.4 เพิ่มเกรด G1 (พี่นก) 17.30 - 19.30', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          4, '17:30:00', '19:30:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.6 A-level (พี่นก) 17.30-19.30', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          5, '17:30:00', '19:30:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ โอลิมปิก# 67 (พี่นก) 13.00-15.30', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          6, '13:00:00', '15:30:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.4 A-level (พี่นก) 18.00 - 20.00', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          6, '18:00:00', '20:00:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.6 A-level (พี่นก) 13.00-16.00', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          7, '13:00:00', '16:00:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.4 A-level (พี่นก) 15.30-17.30', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          7, '15:30:00', '17:30:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.5 เพิ่มเกรด G2 17.30 - 19.30 น.', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          7, '17:30:00', '19:30:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.6 A-level (พี่ขลุ่ย) 17.30-19.30 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          2, '17:30:00', '19:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.4 A-level (พี่ขลุ่ย) 17.30-19.30 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          3, '17:30:00', '19:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.4 A-level (พี่ขลุ่ย) 17.30-19.30 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          4, '17:30:00', '19:30:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.5 A-level (พี่ขลุ่ย) 17.30-19.30 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          5, '17:30:00', '19:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.6 A-level (พี่ขลุ่ย) 13.00-15.00 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          6, '13:00:00', '15:00:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.6 A-level (พี่ขลุ่ย) 15.30-17.30 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          6, '15:30:00', '17:30:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.5 A-level (พี่ขลุ่ย) 18.00-20.00 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          6, '18:00:00', '20:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.4 A-level (พี่ขลุ่ย) 10.00-12.00 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          7, '10:00:00', '12:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.5 A-level (พี่ขลุ่ย) 13.00-15.00 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          7, '13:00:00', '15:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.6 A-level (พี่ขลุ่ย) 15.30-17.30 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          7, '15:30:00', '17:30:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.5 A-level (พี่ขลุ่ย) 18.00-20.00 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          7, '18:00:00', '20:00:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต/น้องพัตเตอร์ ม.3 (พี่ปอร์เช่) 20.00-21.30 น.', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          1, '20:00:00', '21:30:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'MATH UP ม.5 #68 (พี่ปอร์เช่) 18.00-19.30', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          3, '18:00:00', '19:30:00', null,
          'scheduled', '#94A3B8', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.1 (พี่ปอร์เช่) เวลา 17.30-19.30 น.', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          4, '17:30:00', '19:30:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิตกลุ่ม ม.2 (พี่ปอร์เช่) 17.30-19.30', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          5, '17:30:00', '19:30:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต//น้องแบ่งปัน (พี่ปอเช่) 10.00 - 12.00', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          6, '10:00:00', '12:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต //น้องเบล (พี่ปอร์เช่) 12.30-14.00', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          6, '12:30:00', '14:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต //รักเอย (พี่ปอร์เช่) 14.30-16.00', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          6, '14:30:00', '16:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต//น้องบีม+เปเอฟ (พี่ปอร์เช่) 10.30-12.00', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          7, '10:30:00', '12:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.4 (ครูอ๊อด) 17.30-19.30', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          1, '17:30:00', '19:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.6 -TCAS 17.30-19.30', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          2, '17:30:00', '19:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.5 (ครูอ๊อด) 17.30-19.30', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          5, '17:30:00', '19:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ เอิร์ธ (ครูอ๊อด) 8.30 - 10.30', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          6, '08:30:00', '10:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.3 กลุ่ม มิคกี้ 10.00 - 11.30', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          6, '10:00:00', '11:30:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.6 -TCAS 13.00-15.00', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          6, '13:00:00', '15:00:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ น้องบีเอ็ม (ครูอ๊อด) 8.00 - 9.30', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          7, '08:00:00', '09:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ //ชีมะ (ครูอ๊อด) 9.30-11.00', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          7, '09:30:00', '11:00:00', null,
          'scheduled', '#FCA5A5', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต //ต้นกล้า (ครูอ๊อด) 11.00-12.30', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          7, '11:00:00', '12:30:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต// วิณ (ครูอ๊อด) 13.00-14.30', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          7, '13:00:00', '14:30:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต//น้องก้อง (ครูอ๊อด) 14.30 - 16.00', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          7, '14:30:00', '16:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.5 เพิ่มเกรด (พี่ปอง) 17.30-19.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          1, '17:30:00', '19:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.5 A-level (พี่ปอง) 17.30-19.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          2, '17:30:00', '19:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.4 เพิ่มเกรด (พี่ปอง) 17.30-19.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          3, '17:30:00', '19:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.6 A-level กลุ่ม 2 (พี่ปอง) 17.30-19.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          4, '17:30:00', '19:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.4 A-level (พี่ปอง) 17.30 - 19.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          5, '17:30:00', '19:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี//น้องเบล (พี่ปอง) 8.00-9.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          6, '08:00:00', '09:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.4 EP l (พี่ปอง) 17.30 - 19.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          6, '17:30:00', '19:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี//น้องรักเอย (พี่ปอง) 13.00-14.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          6, '13:00:00', '14:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี //น้องข้าวโพด (พี่ปอง) 09.30-10.30 น.', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          6, '09:30:00', '10:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.6 (พี่ปอง) 17.30-20.00 น.', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          6, '17:30:00', '20:00:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.5 EP l (พี่ปอง) 17.30 - 19.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          7, '17:30:00', '19:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.5 A-level (พี่ปอง) 15.30-17.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          7, '15:30:00', '17:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี /บีม+เปเอฟ (พี่ปอง) 17.30-19.00', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          7, '17:30:00', '19:00:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์//กลุ่มน้องสกาย (พี่ถุงเเป้ง) 16.30-18.00', '8d9386cc-6acc-4d5d-bfdf-ba9039290ae0', null, 'online',
          3, '16:30:00', '18:00:00', null,
          'scheduled', '#FCA5A5', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ ม.1 น้องข้าวหอม 19.00 - 20.30', '8d9386cc-6acc-4d5d-bfdf-ba9039290ae0', null, 'online',
          3, '19:00:00', '20:30:00', null,
          'scheduled', '#FCA5A5', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ ม.2 (พี่ถุงเเป้ง) เวลา 17.30-19.30', '8d9386cc-6acc-4d5d-bfdf-ba9039290ae0', null, 'online',
          4, '17:30:00', '19:30:00', null,
          'scheduled', '#FCA5A5', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ ม.1 (พี่ถุงเเป้ง) เวลา 17.30-19.30', '8d9386cc-6acc-4d5d-bfdf-ba9039290ae0', null, 'online',
          5, '17:30:00', '19:30:00', null,
          'scheduled', '#FCA5A5', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ ม.3 น้องพัตเตอร์ 19.30 - 21.00', '8d9386cc-6acc-4d5d-bfdf-ba9039290ae0', null, 'online',
          6, '19:30:00', '21:00:00', null,
          'scheduled', '#FCA5A5', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ น้องธัญ 16.30 - 18.00', 'ccf47958-6457-4fe8-9d5b-ab39ecd89bdc', null, 'online',
          2, '16:30:00', '18:00:00', null,
          'scheduled', '#FCA5A5', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ ม.1 // น้องเบล (พี่มายด์) 17.30-19.00', 'ccf47958-6457-4fe8-9d5b-ab39ecd89bdc', null, 'online',
          3, '17:30:00', '19:00:00', null,
          'scheduled', '#FCA5A5', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.5 (ครูอ๊อด) 17.00-19.00', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          1, '17:00:00', '19:00:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ เอิร์ธ (ครูอ๊อด) 8.30 - 10.00', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          6, '08:30:00', '10:00:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'วิทย์ //ชีมะ (ครูอ๊อด) 9.30-11.00', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          6, '09:30:00', '11:00:00', null,
          'scheduled', '#FCA5A5', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ น้องบีเอ็ม (ครูอ๊อด) 9.00 - 10.30', '08241a5e-e456-4b3d-9092-47f17826e64d', null, 'online',
          7, '09:00:00', '10:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต//น้องภูมิ (พี่ปอเช่) 17.00-19.00', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          2, '17:00:00', '19:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต // น้องกิ่ง 19.00 - 21.00 น', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          4, '19:00:00', '21:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต//น้องบีม+เปเอฟ (พี่ปอร์เช่) 10.30-12.00', '78c0c1eb-9857-4d0e-b738-81d413d645cf', null, 'online',
          5, '10:30:00', '12:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.6 G.1 17.30-19.30', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          3, '17:30:00', '19:30:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ adv.#66 (พี่นก) 8.30-10.30', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          7, '08:30:00', '10:30:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.6 G.1 (พี่นก) 16.00-18.00', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          7, '16:00:00', '18:00:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ชีวะ ม.6 G.2 - 18.00-20.00', '38abf6b2-8294-40ac-9162-3b9e8d1b8a99', null, 'online',
          7, '18:00:00', '20:00:00', null,
          'scheduled', '#86EFAC', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.6 A-level (พี่ปอง) 10.30 - 12.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          6, '10:30:00', '12:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'เคมี ม.4 เพิ่มเกรด (พี่ปอง) 10.30 -12.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          7, '10:30:00', '12:30:00', null,
          'scheduled', '#6EE7B7', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'Basic chem 13.30-15.30', '76630570-ad15-40fa-853c-dcc92ee55115', null, 'online',
          7, '13:30:00', '15:30:00', null,
          'scheduled', '#94A3B8', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'ฟิสิกส์ ม.6 A-level (พี่ขลุ่ย) 17.30-19.30 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          1, '17:30:00', '19:30:00', null,
          'scheduled', '#FBBF24', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;
do $$ begin
  insert into public.schedule_events
    (branch_id, event_type, title_th, tutor_profile_id, room_id, delivery_mode,
     day_of_week, start_time, end_time, planned_student_count,
     status, color_hex, source_type, source_ref)
  values ('11111111-1111-1111-1111-111111111111', 'class', 'คณิต ม.5 A-level (พี่ขลุ่ย) 16.00-18.00 น.', 'a940526b-786a-4f48-91f6-a244d4368514', null, 'online',
          7, '16:00:00', '18:00:00', null,
          'scheduled', '#A78BFA', 'import', 'sheet-import-2026-05');
exception when exclusion_violation then null;
end $$;


-- ✅ Imported 75 events from 7 new tutors

-- ---------------------------------------------------------
-- ถ้าอยาก UNDO (ลบที่ import ทั้งหมด) — uncomment + run:
-- ---------------------------------------------------------
-- delete from public.schedule_events where source_ref = 'sheet-import-2026-05';
-- delete from public.tutor_profiles where short_code in ('NOK','KLY','PCH','AOD','PNG','TPN','MND');
