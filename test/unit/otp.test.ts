import { describe, it, expect } from "vitest";
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
} from "@/lib/otp";

describe("lib/otp", () => {
  it("generateOtp returns a zero-padded 6-digit numeric string", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtp();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    }
  });

  it("hashOtp never returns the plaintext and verifyOtp round-trips", async () => {
    const code = "123456";
    const hash = await hashOtp(code);
    expect(hash).not.toBe(code);
    expect(await verifyOtp(code, hash)).toBe(true);
    expect(await verifyOtp("654321", hash)).toBe(false);
  });

  it("exposes sane TTL and attempt-cap constants", () => {
    expect(OTP_TTL_MS).toBe(10 * 60 * 1000);
    expect(OTP_MAX_ATTEMPTS).toBeGreaterThan(0);
  });
});
