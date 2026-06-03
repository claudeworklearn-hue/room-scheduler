-- Allow grade_level (and code_prefix) to be edited after creation.
-- When either changes, regenerate class_code using the same format as
-- gen_pending_class_code (insert trigger) — [PREFIX][BE2][GRADE][####].
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.regen_pending_class_code_on_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  thai_year_2 text;
  prefix      text;
  next_n      int;
BEGIN
  -- Only act when grade_level or code_prefix actually changed.
  IF NEW.grade_level IS DISTINCT FROM OLD.grade_level
     OR NEW.code_prefix IS DISTINCT FROM OLD.code_prefix THEN

    IF NEW.code_prefix IS NULL OR NEW.code_prefix = '' THEN
      NEW.code_prefix := 'PV';
    END IF;
    IF NEW.grade_level IS NULL OR NEW.grade_level = '' THEN
      RAISE EXCEPTION 'grade_level ต้องระบุ (เช่น M4, M5, P6)';
    END IF;

    thai_year_2 := lpad(((extract(year from now())::int + 543) % 100)::text, 2, '0');
    prefix      := NEW.code_prefix || thai_year_2 || NEW.grade_level;

    SELECT COALESCE(MAX(
      CASE
        WHEN class_code ~ ('^' || prefix || '[0-9]{4}$')
          THEN substring(class_code FROM length(prefix) + 1)::int
        ELSE 0
      END
    ), 0) + 1 INTO next_n
    FROM public.pending_bookings;

    NEW.class_code := prefix || lpad(next_n::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pending_regen_class_code ON public.pending_bookings;

CREATE TRIGGER pending_regen_class_code
  BEFORE UPDATE ON public.pending_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.regen_pending_class_code_on_change();
