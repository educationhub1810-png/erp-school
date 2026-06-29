// Keystroke-level input behavior shared across forms — e.g. blocking
// non-digit keys in a mobile/Aadhaar/PIN field instead of only catching the
// bad value after the fact via zod.
import type { KeyboardEvent } from "react";

const NAVIGATION_KEYS = new Set([
  "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
  "Tab", "Home", "End", "Enter", "Escape",
]);

/** Attach to onKeyDown on a digits-only field (mobile, Aadhaar, PIN code, account number). */
export function digitsOnlyKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  if (NAVIGATION_KEYS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

/** Strip non-digits on paste/autofill for a digits-only field. */
export function digitsOnlyValue(value: string): string {
  return value.replace(/\D/g, "");
}
