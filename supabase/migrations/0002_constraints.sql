-- Room Scheduler — overlap protection + business rules ระดับ DB
-- รันหลัง 0001_init.sql
--
-- หลักคิด:
--   - ใช้ tstzrange + GiST exclusion constraint กัน overlap
--   - ใช้ bounds '[)' (รวมต้น, ไม่รวมท้าย) → back-to-back 17:30 จบ และอีกคลาส 17:30 เริ่ม ไม่ชน
--   - cancelled events ไม่ถูกนับใน overlap check (partial constraint)
--   - tutor overlap เช็คเฉพาะ event_type='class' (room_block ไม่บล็อก tutor)

-- ---------------------------------------------------------
-- 1. กฎเวลา: ends_at > starts_at
-- ---------------------------------------------------------
alter table public.schedule_events
  drop constraint if exists schedule_events_valid_duration;

alter table public.schedule_events
  add constraint schedule_events_valid_duration
  check (ends_at > starts_at);

-- ---------------------------------------------------------
-- 2. กฎ delivery_mode ↔ room
--    - room_block: ต้องมี room, ไม่มี delivery_mode
--    - class online: ต้องไม่มี room
--    - class onsite/hybrid: ต้องมี room
-- ---------------------------------------------------------
alter table public.schedule_events
  drop constraint if exists schedule_events_valid_mode_room;

alter table public.schedule_events
  add constraint schedule_events_valid_mode_room
  check (
    (event_type = 'room_block'
       and room_id is not null
       and delivery_mode is null)
    or
    (event_type = 'class' and (
       (delivery_mode = 'online' and room_id is null)
       or
       (delivery_mode in ('onsite','hybrid') and room_id is not null)
    ))
  );

-- ---------------------------------------------------------
-- 3. ห้องไม่ชน — exclusion constraint บน (room_id, time range)
--    เฉพาะ active events (draft/scheduled) + ต้องมี room_id
-- ---------------------------------------------------------
alter table public.schedule_events
  drop constraint if exists schedule_events_room_no_overlap;

alter table public.schedule_events
  add constraint schedule_events_room_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (
    room_id is not null
    and status in ('draft','scheduled')
  );

-- ---------------------------------------------------------
-- 4. ติวเตอร์ไม่ชน — exclusion constraint บน (tutor_profile_id, time range)
--    เฉพาะ class events (room_block ไม่บล็อก tutor)
-- ---------------------------------------------------------
alter table public.schedule_events
  drop constraint if exists schedule_events_tutor_no_overlap;

alter table public.schedule_events
  add constraint schedule_events_tutor_no_overlap
  exclude using gist (
    tutor_profile_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (
    event_type = 'class'
    and tutor_profile_id is not null
    and status in ('draft','scheduled')
  );

-- ---------------------------------------------------------
-- 5. supporting btree indexes สำหรับ query บ่อย ๆ
-- ---------------------------------------------------------
create index if not exists schedule_events_branch_time_idx
  on public.schedule_events (branch_id, starts_at, ends_at)
  where status in ('draft','scheduled');

create index if not exists schedule_events_room_time_idx
  on public.schedule_events (room_id, starts_at, ends_at)
  where room_id is not null and status in ('draft','scheduled');

create index if not exists schedule_events_tutor_time_idx
  on public.schedule_events (tutor_profile_id, starts_at, ends_at)
  where tutor_profile_id is not null and status in ('draft','scheduled');

create index if not exists schedule_events_course_idx
  on public.schedule_events (course_id) where course_id is not null;

-- ---------------------------------------------------------
-- 6. (optional, ทำตอนเปิด multi-tenant) capacity validation trigger
--    ตอนนี้ comment ไว้ก่อน เพราะ MVP เช็ค capacity ใน app layer ก็พอ
-- ---------------------------------------------------------
-- create or replace function public.check_event_capacity()
-- returns trigger language plpgsql as $$
-- declare cap smallint;
-- begin
--   if new.room_id is null or new.planned_student_count is null then
--     return new;
--   end if;
--   select capacity into cap from public.rooms where id = new.room_id;
--   if new.planned_student_count > cap then
--     raise exception 'planned_student_count (%) exceeds room capacity (%)',
--       new.planned_student_count, cap
--       using errcode = '23514';
--   end if;
--   return new;
-- end;
-- $$;
-- drop trigger if exists trg_schedule_events_capacity on public.schedule_events;
-- create trigger trg_schedule_events_capacity
--   before insert or update on public.schedule_events
--   for each row execute function public.check_event_capacity();
