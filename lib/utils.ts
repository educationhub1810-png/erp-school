import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// DDMMYYYY, no separators — must match dobToPassword() in auth.ts exactly,
// since this is what students/staff actually type in as their password.
export function formatDobAsPassword(dob: Date | string): string {
  const d = new Date(dob);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear());
  return `${day}${month}${year}`;
}
