-- Room Scheduler — pending bookings (waiting list)
-- รันหลัง 0002_constraints.sql
--
-- หลักคิด:
--   - 1 row = 1 deal ที่ดีลกับลูกค้าแล้วแต่ยังไม่ได้ลงตาราง
--   - admin ลากการ์ดจาก side panel ของหน้า room-schedule → drop ลง grid → สร้าง schedule_events
--   - มี FK ไป schedule_events ตอน scheduled แล้ว (เผื่อต้องการ track history)

create table if not exists public.pending_bookings (
  id                       uuid primary key default gen_random_uuid(),
  branch_id                uuid not null references public.branches(id) on delete restrict,
  course_id                uuid references public.courses(id) on delete set null,
  tutor_profile_id         uuid references public.tutor_profiles(id) on delete set null,
  title_th                 varchar(200) not null,
  duration_minutes         smallint not null
                            check (duration_minutes >= 30 and duration_minutes <= 480),
  planned_student_count    smallint check (planned_student_count is null or planned_student_count > 0),
  delivery_mode            varchar(16) not null default 'onsite'
                            check (delivery_mode in ('onsite','online','hybrid')),
  color_hex                char(7),
  notes                    text,
  status                   varchar(16) not null default 'pending'
                            check (status in ('pending','scheduled','cancelled')),
  scheduled_event_id       uuid references public.schedule_events(id) on delete set null,
  created_by_user_id       uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists pending_bookings_branch_pending_idx
  on public.pending_bookings (branch_id, created_at desc)
  where status = 'pending';

-- updated_at trigger
drop trigger if exists trg_pending_bookings_updated_at on public.pending_bookings;
create trigger trg_pending_bookings_updated_at
  before update on public.pending_bookings
  for each row execute function public.set_updated_at();
