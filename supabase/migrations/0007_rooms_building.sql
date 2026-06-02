-- Room Scheduler — rooms: เพิ่ม field 'building' (ตึก/อาคาร)
-- รันหลัง 0006_disable_rls_dev.sql
--
-- เก็บเป็น free text (varchar) — admin พิมพ์ชื่อตึกเองได้
-- ไว้ใช้จัด section ใน daily grid (ตึกหลัก, ตึก med, ...)

alter table public.rooms
  add column if not exists building varchar(64);

create index if not exists rooms_building_idx
  on public.rooms (branch_id, building, sort_order)
  where active = true;

-- backfill ห้องเก่า (A24, D15, G18) ให้อยู่ตึกหลักก่อน
update public.rooms
   set building = 'ตึกหลัก'
 where building is null;
