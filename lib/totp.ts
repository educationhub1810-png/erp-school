import crypto from "crypto";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";

// Time-based one-time password (RFC 6238) helpers for SUPER_ADMIN 2FA.
// Codes from Google Authenticator (and any TOTP app) are accepted with a ±1
// step (±30s) window to tolerate clock skew.
authenticator.options = { window: 1 };

export const TOTP_ISSUER = process.env.TOTP_ISSUER || "EduERP";

/**
 * Whether a valid TOTP code is REQUIRED for super-admin login.
 * Production enforces it; local dev (`next dev`) is password-only by design.
 * `TOTP_ENFORCE=true|false` can override (e.g. to test enforcement locally).
 */
export function isTotpEnforced(): boolean {
  const override = process.env.TOTP_ENFORCE;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV === "production";
}

// ── Secret generation / verification ──────────────────────────────────

export function generateTotpSecret(): string {
  return authenticator.generateSecret(); // base32
}

/** otpauth:// URI to encode in the enrollment QR (scanned by the app). */
export function totpKeyUri(accountEmail: string, secret: string): string {
  return authenticator.keyuri(accountEmail, TOTP_ISSUER, secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  try {
    return authenticator.check(token.replace(/\s/g, ""), secret);
  } catch {
    return false;
  }
}

// ── Encryption of the stored secret (AES-256-GCM) ─────────────────────
// The TOTP secret is a bearer credential; encrypt it at rest so a DB leak
// alone can't clone an authenticator. Key = 32 bytes hex in TOTP_ENC_KEY.

function encKey(): Buffer {
  const hex = process.env.TOTP_ENC_KEY;
  if (!hex) throw new Error("TOTP_ENC_KEY is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("TOTP_ENC_KEY must be 32 bytes (64 hex chars)");
  return key;
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, ctB64] = stored.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}

// ── Recovery codes ────────────────────────────────────────────────────
// One-time backup codes for when the authenticator is unavailable. Stored
// as bcrypt hashes (like passwords); the plaintext is shown once at setup.

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(c.replace(/[\s-]/g, ""), 10)));
}

/**
 * Returns the index of the matching (still-unused) recovery hash, or -1.
 * Caller removes that hash to enforce single use.
 */
export async function matchRecoveryCode(input: string, hashes: string[]): Promise<number> {
  const norm = input.replace(/[\s-]/g, "");
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(norm, hashes[i])) return i;
  }
  return -1;
}
