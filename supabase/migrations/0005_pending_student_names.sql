-- Room Scheduler — pending bookings: เก็บชื่อนักเรียน (สำหรับ Private course)
-- รันหลัง 0004_pending_class_code.sql
--
-- เก็บเป็น jsonb array of strings เช่น ["น้องเอ", "น้องบี", "พี่แต๋ม"]
-- เผื่ออนาคตขยายเป็น array of object {name, note} โดยไม่ต้องเปลี่ยน column type

alter table public.pending_bookings
  add column if not exists student_names jsonb not null default '[]'::jsonb;

-- check constraint: ต้องเป็น array
alter table public.pending_bookings
  drop constraint if exists pending_bookings_student_names_is_array;

alter table public.pending_bookings
  add constraint pending_bookings_student_names_is_array
  check (jsonb_typeof(student_names) = 'array');

-- ค่าเริ่มต้นของ row เก่า: array ว่าง (ตั้งให้แล้วจาก default)
update public.pending_bookings
   set student_names = '[]'::jsonb
 where student_names is null;
