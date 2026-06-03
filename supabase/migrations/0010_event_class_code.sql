-- Link a schedule_events row to the Attendance system's courses.course_code.
-- Group classes (BIO-GFT69-M3, MTH-TCAS69, ...) — the count rendered on the
-- grid is pulled live from Attendance's enrollments table.
-- Private classes use the PV* code pattern and the planned count is fine.
-- Nullable so existing rows are not affected; safe to re-run.

ALTER TABLE public.schedule_events
ADD COLUMN IF NOT EXISTS class_code text;

CREATE INDEX IF NOT EXISTS schedule_events_class_code_idx
  ON public.schedule_events (class_code);
