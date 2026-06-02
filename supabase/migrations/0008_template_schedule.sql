-- Room Scheduler — pivot schedule_events เป็น weekly template
-- รันหลัง 0007_rooms_building.sql
--
-- การเปลี่ยนแปลง:
--   - drop starts_at/ends_at (timestamptz)
--   - เพิ่ม day_of_week (1-7 ISO: 1=Mon..7=Sun), start_time, end_time (time)
--   - 1 row = 1 slot ที่ repeat ทุกสัปดาห์ ไม่มีวันที่จริง
--   - exclusion constraint เปลี่ยนเป็น (room/tutor, day_of_week, time_range)
--
-- ⚠️ การ migrate:
--   ถ้ามีข้อมูลเดิมจะถูก convert: ดึง day_of_week + time จาก starts_at (Asia/Bangkok)
--   ถ้ามี event ที่ทับเวลากันใน day-of-week เดียวกัน → migration จะ fail
--   วิธีแก้: truncate schedule_events ก่อนรัน migration นี้

-- ---------------------------------------------------------
-- 1. drop old constraints + indexes
-- ---------------------------------------------------------
alter table public.schedule_events
  drop constraint if exists schedule_events_room_no_overlap;

alter table public.schedule_events
  drop constraint if exists schedule_events_tutor_no_overlap;

alter table public.schedule_events
  drop constraint if exists schedule_events_valid_duration;

alter table public.schedule_events
  drop constraint if exists schedule_events_valid_mode_room;

drop index if exists schedule_events_branch_time_idx;
drop index if exists schedule_events_room_time_idx;
drop index if exists schedule_events_tutor_time_idx;

-- ---------------------------------------------------------
-- 2. เพิ่ม columns ใหม่ (nullable ก่อน เพื่อ backfill)
-- ---------------------------------------------------------
alter table public.schedule_events
  add column if not exists day_of_week smallint,
  add column if not exists start_time  time,
  add column if not exists end_time    time;

-- ---------------------------------------------------------
-- 3. backfill จาก starts_at/ends_at (เฉพาะ rows เก่าที่ยังไม่มี)
-- ---------------------------------------------------------
update public.schedule_events
   set day_of_week = (extract(isodow from (starts_at at time zone 'Asia/Bangkok')))::smallint,
       start_time  = (starts_at at time zone 'Asia/Bangkok')::time,
       end_time    = (ends_at   at time zone 'Asia/Bangkok')::time
 where day_of_week is null
   and starts_at is not null;

-- ---------------------------------------------------------
-- 4. drop columns เก่า (timestamptz)
-- ---------------------------------------------------------
alter table public.schedule_events
  drop column if exists starts_at,
  drop column if exists ends_at;

-- ---------------------------------------------------------
-- 5. set NOT NULL + check constraints ใหม่
-- ---------------------------------------------------------
alter table public.schedule_events
  alter column day_of_week set not null,
  alter column start_time  set not null,
  alter column end_time    set not null;

alter table public.schedule_events
  add constraint schedule_events_day_of_week_range
  check (day_of_week between 1 and 7);

alter table public.schedule_events
  add constraint schedule_events_valid_duration
  check (end_time > start_time);

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
-- 6. exclusion constraints ใหม่
--    ใช้ tsrange บน fixed date (2000-01-01) + time
--    btree_gist ทำให้รวม smallint (day_of_week) + uuid (room_id) ได้
-- ---------------------------------------------------------
alter table public.schedule_events
  add constraint schedule_events_room_no_overlap
  exclude using gist (
    room_id     with =,
    day_of_week with =,
    tsrange(
      '2000-01-01'::timestamp + start_time,
      '2000-01-01'::timestamp + end_time,
      '[)'
    ) with &&
  )
  where (
    room_id is not null
    and status in ('draft','scheduled')
  );

alter table public.schedule_events
  add constraint schedule_events_tutor_no_overlap
  exclude using gist (
    tutor_profile_id with =,
    day_of_week      with =,
    tsrange(
      '2000-01-01'::timestamp + start_time,
      '2000-01-01'::timestamp + end_time,
      '[)'
    ) with &&
  )
  where (
    event_type = 'class'
    and tutor_profile_id is not null
    and status in ('draft','scheduled')
  );

-- ---------------------------------------------------------
-- 7. supporting btree indexes
-- ---------------------------------------------------------
create index if not exists schedule_events_branch_day_idx
  on public.schedule_events (branch_id, day_of_week, start_time)
  where status in ('draft','scheduled');

create index if not exists schedule_events_room_day_idx
  on public.schedule_events (room_id, day_of_week, start_time)
  where room_id is not null and status in ('draft','scheduled');

create index if not exists schedule_events_tutor_day_idx
  on public.schedule_events (tutor_profile_id, day_of_week, start_time)
  where tutor_profile_id is not null and status in ('draft','scheduled');
