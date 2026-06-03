/**
 * Cross-project read of student counts from the Attendance Supabase project
 * (knowledgeth-attendance). Used to enrich event blocks on the schedule grid
 * with the *actual* roster size instead of the manually-typed
 * planned_student_count.
 *
 * Anon key only — RLS on Attendance lets `anon` read the enrollments table
 * the same way the Attendance frontend already does. Safe to embed.
 */

const ATTENDANCE_URL = "https://dnndbrfdfuyufhppxkmt.supabase.co";
const ATTENDANCE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubmRicmZkZnV5dWZocHB4a210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Mjg1NjIsImV4cCI6MjA5MzAwNDU2Mn0.qJ5lDf8TfZr7yOhaDi528CNHQSwjG0NcuVfshROWf0A";

const REST = `${ATTENDANCE_URL}/rest/v1`;

/** Codes that start with PV come from the private booking flow — for those
 *  we already store the headcount on schedule_events and don't need to call
 *  Attendance. */
export function isGroupCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return !code.toUpperCase().startsWith("PV");
}

/**
 * Returns a Map<course_code, active_enrollment_count>.
 *
 * Reads from the `course_enrollment_counts` VIEW in the Attendance project
 * (pre-aggregated, anon-readable; raw enrollments stay locked behind RLS so
 * student PII is never exposed cross-project).
 */
export async function getEnrollmentCounts(
  classCodes: (string | null | undefined)[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();

  const uniq = Array.from(
    new Set(classCodes.filter(isGroupCode) as string[]),
  );
  if (uniq.length === 0) return out;

  const list = uniq.map(encodeURIComponent).join(",");
  const url =
    `${REST}/course_enrollment_counts` +
    `?course_code=in.(${list})` +
    `&select=course_code,active_count`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        apikey: ATTENDANCE_ANON_KEY,
        Authorization: `Bearer ${ATTENDANCE_ANON_KEY}`,
      },
      next: { revalidate: 60 },
    });
  } catch {
    return out; // network blip → fall back to planned_student_count
  }

  if (!res.ok) return out;
  const rows = (await res.json()) as {
    course_code: string;
    active_count: number;
  }[];
  for (const r of rows) {
    out.set(r.course_code, r.active_count);
  }
  return out;
}
