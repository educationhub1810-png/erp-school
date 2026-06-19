import crypto from "crypto";

/**
 * Constant-time string comparison. Returns false if either value is missing.
 * Hashing both inputs to a fixed length avoids leaking length via
 * timingSafeEqual's length-mismatch throw, so timing does not reveal how
 * many characters of a secret were correct.
 */
export function secureEquals(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}
