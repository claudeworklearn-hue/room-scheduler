-- Per-tutor "ปิดรับคอร์สใหม่" marker.
-- Stored as an array of ISO weekdays (1=Mon..7=Sun) on tutor_profiles.
-- Defaults to '{}' — every tutor accepts every day until they say otherwise.
--
-- Safe to re-run.

ALTER TABLE public.tutor_profiles
ADD COLUMN IF NOT EXISTS closed_days_for_new int[] NOT NULL DEFAULT '{}';

-- A GIN index lets the deal-planner filter "tutors who are open on day N"
-- in one indexed step instead of array_position on every row.
CREATE INDEX IF NOT EXISTS tutor_profiles_closed_days_for_new_idx
  ON public.tutor_profiles
  USING gin (closed_days_for_new);
