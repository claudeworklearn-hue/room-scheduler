"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const HEX = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "สี hex ต้องเริ่มด้วย # และมี 6 ตัวอักษร")
  .or(z.literal("").transform(() => null))
  .nullable()
  .optional();

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
  return {
    branch_id: (fd.get("branch_id") as string) || "",
    display_name_th: fd.get("display_name_th") as string,
    display_name_en: (fd.get("display_name_en") as string) || "",
    short_code: fd.get("short_code") as string,
    color_hex: (fd.get("color_hex") as string) || "",
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
    active: data.active,
  };
}

function revalidate() {
  revalidatePath("/admin/tutors");
  revalidatePath("/admin/room-schedule");
  revalidatePath("/tutor/my-schedule");
  revalidatePath("/");
}

export async function createTutor(
  _prev: TutorFormState,
  fd: FormData,
): Promise<TutorFormState> {
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
  const id = formData.get("id") as string;
  const next = formData.get("active") === "true";
  if (!id) return;

  const supabase = createServerSupabase();
  await supabase.from("tutor_profiles").update({ active: next }).eq("id", id);
  revalidate();
}
