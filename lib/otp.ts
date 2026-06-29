import crypto from "crypto";
import bcrypt from "bcryptjs";

// How long a login OTP stays valid, and how many verify attempts are allowed
// before the code is burned. Short TTL + low attempt cap keep a 6-digit code
// (1e6 space) safe against online guessing.
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
// Minimum gap between successive code requests for one account (resend cooldown).
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

// A 6-digit numeric code. crypto.randomInt is unbiased (unlike Math.random or
// `% 1e6`), matching the approach in lib/password.ts.
export function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export function verifyOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
