"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkEditPinFromForm } from "@/lib/edit-pin";

const HEX = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "สี hex ต้องเริ่มด้วย # และมี 6 ตัวอักษร")
  .or(z.literal("").transform(() => null))
  .nullable()
  .optional();

const SUBJECT_KEY = z.enum(["physics", "chem", "bio", "math", "science", "english"]);

const DAY_OF_WEEK = z.coerce.number().int().min(1).max(7);

const TutorInput = z.object({
  branch_id: z.string().uuid().or(z.literal("")).optional(),
  display_name_th: z
    .string()
    .trim()
    .min(1, "ใส่ชื่อ (ไทย)")
    .max(120, "ชื่อยาวเกิน 120 ตัวอักษร"),
  display_name_en: z.string().trim().max(120).optional().or(z.literal("")),
  short_code: z
    .string()
    .trim()
    .min(1, "ใส่ short code")
    .max(8, "short code ยาวเกิน 8 ตัวอักษร"),
  color_hex: HEX,
  subjects: z.array(SUBJECT_KEY).default([]),
  closed_days_for_new: z.array(DAY_OF_WEEK).default([]),
  active: z.coerce.boolean(),
});

export type TutorFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof TutorInput>, string>>;
};

function flattenErrors(err: z.ZodError): TutorFormState["fieldErrors"] {
  const out: TutorFormState["fieldErrors"] = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof z.infer<typeof TutorInput>;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function fdToInput(fd: FormData) {
  // subjects ส่งมาเป็น JSON string (hidden input) — parse แบบ defensive
  let subjects: string[] = [];
  const raw = fd.get("subjects") as string | null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        subjects = parsed.map((s) => String(s));
      }
    } catch {
      // ignore — defaults to []
    }
  }

  let closedDays: number[] = [];
  const rawDays = fd.get("closed_days_for_new") as string | null;
  if (rawDays) {
    try {
      const parsed = JSON.parse(rawDays);
      if (Array.isArray(parsed)) {
        closedDays = parsed
          .map((d) => Number(d))
          .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
      }
    } catch {
      // ignore — defaults to []
    }
  }

  return {
    branch_id: (fd.get("branch_id") as string) || "",
    display_name_th: fd.get("display_name_th") as string,
    display_name_en: (fd.get("display_name_en") as string) || "",
    short_code: fd.get("short_code") as string,
    color_hex: (fd.get("color_hex") as string) || "",
    subjects,
    closed_days_for_new: closedDays,
    active: fd.get("active") === "on" || fd.get("active") === "true",
  };
}

function toRow(data: z.infer<typeof TutorInput>) {
  return {
    branch_id: data.branch_id || null,
    display_name_th: data.display_name_th,
    display_name_en: data.display_name_en || null,
    short_code: data.short_code,
    color_hex: data.color_hex || null,
    subjects: data.subjects,
    closed_days_for_new: data.closed_days_for_new,
    active: data.active,
  };
}

function revalidate() {
  revalidatePath("/admin/tutors");
  revalidatePath("/admin/room-schedule");
  revalidatePath("/admin/deal-planner");
  revalidatePath("/tutor/my-schedule");
  revalidatePath("/");
}

/**
 * Quick toggle from the deal-planner — flips one day in/out of the
 * tutor's closed_days_for_new array without opening the full form.
 */
export async function toggleTutorClosedDay(formData: FormData): Promise<void> {
  if (checkEditPinFromForm(formData)) return;
  const id = formData.get("id") as string;
  const day = Number(formData.get("day"));
  if (!id || !Number.isInteger(day) || day < 1 || day > 7) return;

  const supabase = createServerSupabase();
  const { data: existing, error: loadErr } = await supabase
    .from("tutor_profiles")
    .select("closed_days_for_new")
    .eq("id", id)
    .maybeSingle();
  if (loadErr || !existing) return;

  const current = ((existing.closed_days_for_new as number[]) ?? []).filter(
    (d) => Number.isInteger(d) && d >= 1 && d <= 7,
  );
  const next = current.includes(day)
    ? current.filter((d) => d !== day)
    : [...current, day].sort((a, b) => a - b);

  await supabase
    .from("tutor_profiles")
    .update({ closed_days_for_new: next })
    .eq("id", id);
  revalidate();
}

export async function createTutor(
  _prev: TutorFormState,
  fd: FormData,
): Promise<TutorFormState> {
  const pinErr = checkEditPinFromForm(fd);
  if (pinErr) return { error: pinErr };

  const parsed = TutorInput.safeParse(fdToInput(fd));
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง", fieldErrors: flattenErrors(parsed.error) };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.from("tutor_profiles").insert(toRow(parsed.data));

  if (error) {
    if (error.code === "23505") {
      return {
        error: "short code นี้ถูกใช้แล้ว",
        fieldErrors: { short_code: "ซ้ำ" },
      };
    }
    return { error: error.message };
  }

  revalidate();
  return { ok: true };
}

export async function updateTutor(
  _prev: TutorFormState,
  fd: FormData,
): Promise<TutorFormState> {
  const pinErr = checkEditPinFromForm(fd);
  if (pinErr) return { error: pinErr };

  const id = fd.get("id") as string;
  if (!id) return { error: "ไม่พบ id ของติวเตอร์" };

  const parsed = TutorInput.safeParse(fdToInput(fd));
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง", fieldErrors: flattenErrors(parsed.error) };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("tutor_profiles")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "short code นี้ถูกใช้แล้ว",
        fieldErrors: { short_code: "ซ้ำ" },
      };
    }
    return { error: error.message };
  }

  revalidate();
  return { ok: true };
}

export async function toggleTutorActive(formData: FormData): Promise<void> {
  if (checkEditPinFromForm(formData)) return;
  const id = formData.get("id") as string;
  const next = formData.get("active") === "true";
  if (!id) return;

  const supabase = createServerSupabase();
  await supabase.from("tutor_profiles").update({ active: next }).eq("id", id);
  revalidate();
}
