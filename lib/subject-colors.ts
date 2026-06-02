// Subject-based color palette
// Title-detection takes precedence over event/course/tutor colors so
// the grid is colored by subject regardless of who teaches it.

export const SUBJECT_COLORS = {
  physics: "#EF4444", // ฟิสิกส์ — แดง
  chem:    "#A855F7", // เคมี — ม่วง
  bio:     "#22C55E", // ชีวะ — เขียว
  math:    "#3B82F6", // คณิต — ฟ้า
  science: "#EAB308", // วิทย์ (รวม) — เหลือง
  english: "#F9A8D4", // ภาษาอังกฤษ — ชมพูอ่อน (แยกจากฟิสิกส์แดงให้เห็นชัด)
} as const;

export function detectSubjectColor(title: string | null | undefined): string | null {
  if (!title) return null;
  const t = title.toLowerCase();

  // Check specific subjects BEFORE generic "วิทย์" so that
  // "วิทย์ฟิสิกส์" / "วิทย์เคมี" route to the specific subject.
  if (t.includes("ฟิสิกส์") || t.includes("physics")) return SUBJECT_COLORS.physics;
  if (t.includes("เคมี")    || t.includes("chem"))    return SUBJECT_COLORS.chem;
  if (t.includes("ชีวะ")    || t.includes("ชีววิทยา") || t.includes("bio")) return SUBJECT_COLORS.bio;
  if (t.includes("คณิต")    || t.includes("math"))    return SUBJECT_COLORS.math;
  if (t.includes("อังกฤษ")  || t.includes("english") || t.includes("eng")) return SUBJECT_COLORS.english;

  // generic science last
  if (t.includes("วิทย์")) return SUBJECT_COLORS.science;

  return null;
}

export function resolveEventColor(
  title: string | null | undefined,
  fallbacks: (string | null | undefined)[],
  defaultColor = "#E5E7EB",
): string {
  return (
    detectSubjectColor(title) ||
    fallbacks.find((c): c is string => !!c) ||
    defaultColor
  );
}
