"use client";

import { useEffect, useState, useCallback } from "react";
import { PIN_STORAGE_KEY } from "@/lib/edit-pin";

/**
 * Client hook for the edit PIN stored in localStorage. Shared across all
 * components by listening to the "storage" event + a custom DOM event
 * dispatched by the toggle button so siblings re-read instantly.
 */

const PIN_CHANGE_EVENT = "ka-edit-pin-change";

export function useEditPin(): {
  pin: string;           // "" if not unlocked
  isUnlocked: boolean;
  unlock: (pin: string) => void;
  lock: () => void;
  ready: boolean;        // true after first client-side read (avoids SSR mismatch)
} {
  const [pin, setPin] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = typeof window !== "undefined"
      ? window.localStorage.getItem(PIN_STORAGE_KEY) ?? ""
      : "";
    setPin(initial);
    setReady(true);

    const refresh = () => {
      setPin(window.localStorage.getItem(PIN_STORAGE_KEY) ?? "");
    };
    window.addEventListener("storage", refresh);
    window.addEventListener(PIN_CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(PIN_CHANGE_EVENT, refresh);
    };
  }, []);

  const unlock = useCallback((next: string) => {
    window.localStorage.setItem(PIN_STORAGE_KEY, next);
    window.dispatchEvent(new Event(PIN_CHANGE_EVENT));
    setPin(next);
  }, []);

  const lock = useCallback(() => {
    window.localStorage.removeItem(PIN_STORAGE_KEY);
    window.dispatchEvent(new Event(PIN_CHANGE_EVENT));
    setPin("");
  }, []);

  return { pin, isUnlocked: pin.length > 0, unlock, lock, ready };
}
