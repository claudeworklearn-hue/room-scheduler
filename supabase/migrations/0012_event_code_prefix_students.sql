-- Add the class-type marker (code_prefix) and the per-event student roster
-- to schedule_events. Mirrors what pending_bookings already carries so the
-- info isn't lost when a pending booking is scheduled onto the grid.
--
-- code_prefix:
--   PV — Private (1-on-1 or tiny group; student_names is the actual roster)
--   GR — Group (regular cohort; roster lives in Attendance)
--   CM / IN — Camp / Intensive (treated as group)
-- Defaults to GR for legacy rows so the existing grid stays group-by-default.
--
-- Safe to re-run.

ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS code_prefix text NOT NULL DEFAULT 'GR',
  ADD COLUMN IF NOT EXISTS student_names text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS schedule_events_code_prefix_idx
  ON public.schedule_events (code_prefix);

-- Backfill from already-scheduled pendings so the grid picks up the names
-- that were captured at booking time.
-- pending_bookings.student_names is jsonb, schedule_events.student_names is text[].
-- Cast through jsonb_array_elements_text so the backfill compiles.
UPDATE public.schedule_events e
SET code_prefix   = p.code_prefix,
    student_names = COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p.student_names)),
      '{}'::text[]
    )
FROM public.pending_bookings p
WHERE p.scheduled_event_id = e.id
  AND p.code_prefix IS NOT NULL;
