-- Room Scheduler — initial schema
-- Knowledge Academy, 2026-05-20
-- รัน: supabase db push  หรือ paste ใน Supabase SQL editor

-- ---------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------
create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "btree_gist";     -- ใช้คู่กับ GiST exclusion constraint

-- ---------------------------------------------------------
-- 1. branches — สาขา
-- ---------------------------------------------------------
create table if not exists public.branches (
  id           uuid primary key default gen_random_uuid(),
  slug         varchar(32) not null unique,
  name_th      varchar(120) not null,
  name_en      varchar(120),
  timezone     varchar(64) not null default 'Asia/Bangkok',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. tutor_profiles — ติวเตอร์ (เชื่อม user ภายหลังตอนมี auth)
-- ---------------------------------------------------------
create table if not exists public.tutor_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid,                          -- map ไป auth.users.id ทีหลัง
  branch_id          uuid references public.branches(id) on delete restrict,
  display_name_th    varchar(120) not null,
  display_name_en    varchar(120),
  short_code         varchar(16) not null,          -- ใช้ใน import sheet (MAY, BOY, …)
  color_hex          char(7),
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index if not exists tutor_profiles_short_code_uniq
  on public.tutor_profiles (short_code) where active = true;

create index if not exists tutor_profiles_branch_idx
  on public.tutor_profiles (branch_id, active);

-- ---------------------------------------------------------
-- 3. rooms — ห้องเรียน
-- ---------------------------------------------------------
create table if not exists public.rooms (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references public.branches(id) on delete restrict,
  code            varchar(16) not null,              -- A24, D15, G18
  name_th         varchar(120) not null,
  name_en         varchar(120),
  capacity        smallint not null check (capacity > 0),
  room_type       varchar(32) not null default 'classroom'
                   check (room_type in ('classroom','lab','meeting','studio','other')),
  equipment       jsonb not null default '[]'::jsonb,
  location_note   varchar(255),
  sort_order      smallint not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (branch_id, code)
);

create index if not exists rooms_list_idx
  on public.rooms (branch_id, active, sort_order, code);

-- ---------------------------------------------------------
-- 4. courses — คอร์ส (ฟิสิกส์ ม.4, เคมี ม.1, ...)
-- ---------------------------------------------------------
create table if not exists public.courses (
  id                  uuid primary key default gen_random_uuid(),
  branch_id           uuid references public.branches(id) on delete restrict,  -- null = ใช้ได้ทุกสาขา
  course_code         varchar(32) not null,
  title_th            varchar(160) not null,
  title_en            varchar(160),
  subject             varchar(64),
  default_color_hex   char(7),
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (course_code)
);

create index if not exists courses_active_idx
  on public.courses (active, subject);

-- ---------------------------------------------------------
-- 5. schedule_events — หัวใจของระบบ (1 row = 1 occurrence)
-- ---------------------------------------------------------
create table if not exists public.schedule_events (
  id                     uuid primary key default gen_random_uuid(),
  branch_id              uuid not null references public.branches(id) on delete restrict,
  event_type             varchar(16) not null
                          check (event_type in ('class','room_block')),
  title_th               varchar(200) not null,
  course_id              uuid references public.courses(id) on delete set null,
  tutor_profile_id       uuid references public.tutor_profiles(id) on delete set null,
  room_id                uuid references public.rooms(id) on delete restrict,
  delivery_mode          varchar(16)
                          check (delivery_mode in ('onsite','online','hybrid')),
  starts_at              timestamptz not null,
  ends_at                timestamptz not null,
  planned_student_count  smallint,
  status                 varchar(16) not null default 'scheduled'
                          check (status in ('draft','scheduled','cancelled')),
  color_hex              char(7),
  source_type            varchar(16) not null default 'manual'
                          check (source_type in ('manual','import','api')),
  source_ref             varchar(255),
  notes                  text,
  created_by_user_id     uuid,
  updated_by_user_id     uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 6. import_runs / import_rows — Google Sheet import pipeline
-- ---------------------------------------------------------
create table if not exists public.import_runs (
  id                  uuid primary key default gen_random_uuid(),
  source_type         varchar(32) not null default 'google_sheet',
  source_ref          varchar(512),
  branch_id           uuid not null references public.branches(id) on delete restrict,
  target_start_date   date not null,
  target_end_date     date not null,
  status              varchar(16) not null default 'preview'
                       check (status in ('preview','ready','committed','failed','cancelled')),
  created_by_user_id  uuid,
  created_at          timestamptz not null default now(),
  committed_at        timestamptz,
  notes               text,
  check (target_end_date >= target_start_date)
);

create index if not exists import_runs_status_idx
  on public.import_runs (status, created_at desc);

create table if not exists public.import_rows (
  id                            uuid primary key default gen_random_uuid(),
  run_id                        uuid not null references public.import_runs(id) on delete cascade,
  sheet_name                    varchar(120),
  weekday_iso                   smallint check (weekday_iso between 1 and 7),
  room_label                    varchar(64),
  start_local                   time,
  end_local                     time,
  raw_text                      text,
  color_hex                     char(7),
  delivery_mode_hint            varchar(16),
  student_count_hint            smallint,
  resolved_room_id              uuid references public.rooms(id),
  resolved_course_id            uuid references public.courses(id),
  resolved_tutor_profile_id     uuid references public.tutor_profiles(id),
  resolution_status             varchar(16) not null default 'pending'
                                 check (resolution_status in ('pending','matched','needs_review','ignored')),
  error_text                    text,
  committed_event_id            uuid references public.schedule_events(id),
  created_at                    timestamptz not null default now()
);

create index if not exists import_rows_run_idx
  on public.import_rows (run_id, resolution_status);

-- ---------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array['branches','tutor_profiles','rooms','courses','schedule_events'])
  loop
    execute format(
      'drop trigger if exists trg_%I_updated_at on public.%I;', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end$$;
