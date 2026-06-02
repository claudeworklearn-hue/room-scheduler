"use client";

import { useEditPin } from "./useEditMode";
import { PIN_FIELD } from "@/lib/edit-pin";

/** Hidden form input that auto-injects the current edit PIN.
 *  Place inside any <form action={serverAction}> that mutates data. */
export function EditPinField() {
  const { pin } = useEditPin();
  return <input type="hidden" name={PIN_FIELD} value={pin} />;
}
