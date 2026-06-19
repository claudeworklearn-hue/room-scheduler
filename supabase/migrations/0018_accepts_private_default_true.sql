-- ครู "รับสอนคอร์สเดี่ยว" เป็นค่าเริ่มต้น (opt-out)
-- รันหลัง 0017. accepts_new_private ถูกสร้างใน 0015 (default false) — เปลี่ยนเป็น
-- opt-out: ครูทุกคนรับเดี่ยวโดยปริยาย, แอดมินติ๊กออกเฉพาะคนที่ไม่รับ.
-- Safe to re-run.

alter table public.tutor_profiles
  alter column accepts_new_private set default true;

-- ครูเดิมทั้งหมด → รับเดี่ยว (ตั้งต้น) เพื่อไม่ให้ /book ว่างเปล่าหลังเปิด filter
update public.tutor_profiles
  set accepts_new_private = true
  where accepts_new_private is distinct from true;
