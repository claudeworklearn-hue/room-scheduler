-- Relax the tutor-overlap exclusion for online classes.
-- Rationale: a tutor can stream/recording-broadcast to multiple group
-- audiences at the same wall-clock time. The constraint should still
-- catch double-booking for onsite/hybrid where the tutor must be
-- physically present.
--
-- Safe to re-run.

ALTER TABLE public.schedule_events
  DROP CONSTRAINT IF EXISTS schedule_events_tutor_no_overlap;

ALTER TABLE public.schedule_events
  ADD CONSTRAINT schedule_events_tutor_no_overlap
  EXCLUDE USING gist (
    tutor_profile_id WITH =,
    day_of_week      WITH =,
    tsrange(
      '2000-01-01'::timestamp + start_time,
      '2000-01-01'::timestamp + end_time,
      '[)'
    ) WITH &&
  )
  WHERE (
    event_type = 'class'
    AND tutor_profile_id IS NOT NULL
    AND status IN ('draft','scheduled')
    AND (delivery_mode IS NULL OR delivery_mode <> 'online')
  );
