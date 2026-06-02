/**
 * PIN-based edit gate.
 *
 * Read-only by default for anyone visiting the public URL. Edits require a
 * shared PIN stored in localStorage on the client and validated against
 * `process.env.EDIT_PIN` on the server.
 *
 * If EDIT_PIN is unset (e.g. local dev), the gate is OFF — every action
 * succeeds without a pin. This lets developers run the app without an env
 * var while still locking the production deployment when EDIT_PIN is set.
 */

export const PIN_FIELD = "pin";
export const PIN_STORAGE_KEY = "ka-room-scheduler.edit-pin";

/** True when the env var is set — i.e. the gate is enforced in this deployment. */
export function editGateEnabled(): boolean {
  return !!process.env.EDIT_PIN;
}

/**
 * Server-side check. Returns null if OK, an error message if blocked.
 * Pass `fd.get("pin")` (or the same value from a typed object).
 */
export function checkEditPin(supplied: string | null | undefined): string | null {
  const expected = process.env.EDIT_PIN;
  if (!expected) return null; // gate off
  if (!supplied) return "ต้องใส่ PIN ก่อนแก้ไข (กดปุ่ม 🔒 มุมซ้ายล่าง)";
  if (supplied !== expected) return "PIN ไม่ถูกต้อง";
  return null;
}

export function checkEditPinFromForm(fd: FormData): string | null {
  return checkEditPin(fd.get(PIN_FIELD) as string | null);
}
