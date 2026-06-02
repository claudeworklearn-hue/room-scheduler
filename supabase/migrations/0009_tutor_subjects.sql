-- Add subjects array to tutor_profiles
-- Each tutor can teach multiple subjects. Values are subject keys from
-- lib/subject-colors.ts (physics, chem, bio, math, science, english).
-- Defaults to empty array; safe to re-run.

ALTER TABLE public.tutor_profiles
ADD COLUMN IF NOT EXISTS subjects text[] NOT NULL DEFAULT '{}';

-- GIN index in case we want to filter "tutors who teach physics" later.
CREATE INDEX IF NOT EXISTS tutor_profiles_subjects_idx
  ON public.tutor_profiles
  USING gin (subjects);
