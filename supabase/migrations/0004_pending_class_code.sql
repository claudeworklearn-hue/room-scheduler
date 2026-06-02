-- Room Scheduler — pending bookings: รหัสคลาสอัตโนมัติ
-- รันหลัง 0003_pending_bookings.sql
--
-- รูปแบบรหัส: [PREFIX][พ.ศ. 2 หลัก][ระดับชั้น][ลำดับ 4 หลัก]
--   เช่น PV69M40001 = Private, พ.ศ. 2569, ม.4, คลาสที่ 1
--   ลำดับนับแยกตาม prefix เต็ม → reset ทุกปีและทุกระดับ

-- ---------------------------------------------------------
-- 1. เพิ่ม columns (nullable ก่อน เพื่อ migrate ปลอดภัย)
-- ---------------------------------------------------------
alter table public.pending_bookings
  add column if not exists code_prefix varchar(8),
  add column if not exists grade_level varchar(8),
  add column if not exists class_code  varchar(20);

-- ---------------------------------------------------------
-- 2. trigger function สำหรับ generate class_code
-- ---------------------------------------------------------
create or replace function public.gen_pending_class_code()
returns trigger
language plpgsql
as $$
declare
  thai_year_2 text;
  prefix      text;
  next_n      int;
begin
  -- ถ้าระบุ class_code มาเอง → เคารพค่าที่ส่งมา (กรณี import data เก่า)
  if new.class_code is not null and length(new.class_code) > 0 then
    return new;
  end if;

  if new.code_prefix is null or new.code_prefix = '' then
    new.code_prefix := 'PV';
  end if;
  if new.grade_level is null or new.grade_level = '' then
    raise exception 'grade_level ต้องระบุ (เช่น M4, M5, P6)';
  end if;

  -- พ.ศ. 2 หลักท้าย ของปีที่ insert
  thai_year_2 := lpad(((extract(year from now())::int + 543) % 100)::text, 2, '0');
  prefix      := new.code_prefix || thai_year_2 || new.grade_level;

  -- หา max ลำดับใน prefix เดียวกัน (regex match 4 หลักท้าย)
  select coalesce(max(
    case
      when class_code ~ ('^' || prefix || '[0-9]{4}$')
        then substring(class_code from length(prefix) + 1)::int
      else 0
    end
  ), 0) + 1
    into next_n
    from public.pending_bookings
    where class_code like prefix || '%';

  if next_n > 9999 then
    raise exception 'ลำดับเกิน 9999 สำหรับ prefix % แล้ว', prefix;
  end if;

  new.class_code := prefix || lpad(next_n::text, 4, '0');
  return new;
end;
$$;

-- ---------------------------------------------------------
-- 3. backfill ข้อมูลเก่า (rows ที่ยังไม่มี class_code)
-- ---------------------------------------------------------
-- ตั้ง default ระดับ M4 + prefix PV สำหรับ row เก่า
-- (ปกติจะมีแต่ของ seed ที่จะรันใหม่ทับอยู่แล้ว)
update public.pending_bookings
   set code_prefix = coalesce(code_prefix, 'PV'),
       grade_level = coalesce(grade_level, 'M4')
 where class_code is null;

-- generate class_code ให้ทีละ row (วน loop เพื่อไม่ให้ลำดับชนกัน)
do $$
declare
  r record;
  thai_year_2 text;
  prefix text;
  next_n int;
begin
  thai_year_2 := lpad(((extract(year from now())::int + 543) % 100)::text, 2, '0');
  for r in
    select id, code_prefix, grade_level
      from public.pending_bookings
     where class_code is null
     order by created_at
  loop
    prefix := r.code_prefix || thai_year_2 || r.grade_level;
    select coalesce(max(
      case when class_code ~ ('^' || prefix || '[0-9]{4}$')
           then substring(class_code from length(prefix)+1)::int
           else 0 end
    ), 0) + 1
    into next_n
    from public.pending_bookings
    where class_code like prefix || '%';

    update public.pending_bookings
       set class_code = prefix || lpad(next_n::text, 4, '0')
     where id = r.id;
  end loop;
end$$;

-- ---------------------------------------------------------
-- 4. ตั้ง NOT NULL + UNIQUE หลัง backfill เสร็จ
-- ---------------------------------------------------------
alter table public.pending_bookings
  alter column code_prefix set default 'PV',
  alter column code_prefix set not null,
  alter column grade_level set not null,
  alter column class_code  set not null;

create unique index if not exists pending_bookings_class_code_uniq
  on public.pending_bookings (class_code);

-- ---------------------------------------------------------
-- 5. ติด trigger ตอน insert (เฉพาะกรณีไม่ส่ง class_code มา)
-- ---------------------------------------------------------
drop trigger if exists trg_pending_bookings_gen_code on public.pending_bookings;
create trigger trg_pending_bookings_gen_code
  before insert on public.pending_bookings
  for each row execute function public.gen_pending_class_code();
