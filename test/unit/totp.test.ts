import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { authenticator } from "otplib";
import {
  generateTotpSecret,
  totpKeyUri,
  verifyTotp,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
  matchRecoveryCode,
  isTotpEnforced,
} from "@/lib/totp";

beforeEach(() => {
  process.env.TOTP_ENC_KEY = "acdc3b3417097e685ec95c7ec6251660e1eac6d0d0f07ccdab0909b8a4f53342";
});

describe("TOTP secret + verification", () => {
  it("generates a base32 secret", () => {
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]+$/);
  });

  it("builds an otpauth:// keyuri with issuer and account", () => {
    const uri = totpKeyUri("admin@example.com", "JBSWY3DPEHPK3PXP");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("EduERP");
  });

  it("accepts the current authenticator code, rejects wrong/empty ones", () => {
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotp(code, secret)).toBe(true);
    expect(verifyTotp(`${code} `, secret)).toBe(true); // whitespace tolerated
    expect(verifyTotp("000000", secret)).toBe(false);
    expect(verifyTotp("", secret)).toBe(false);
    expect(verifyTotp(code, "")).toBe(false);
  });
});

describe("secret encryption (AES-256-GCM)", () => {
  it("round-trips a secret and does not store it in plaintext", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const enc = encryptSecret(secret);
    expect(enc).not.toContain(secret);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret("SECRET")).not.toBe(encryptSecret("SECRET"));
  });

  it("rejects tampered ciphertext (auth tag)", () => {
    const enc = encryptSecret("SECRET");
    const tampered = enc.slice(0, -2) + (enc.endsWith("A") ? "B" : "A");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws when the key is missing", () => {
    delete process.env.TOTP_ENC_KEY;
    expect(() => encryptSecret("x")).toThrow(/TOTP_ENC_KEY/);
  });
});

describe("recovery codes", () => {
  it("generates the requested count of dashed codes", () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    expect(codes[0]).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
  });

  it("matches a code once (single-use after removal)", async () => {
    const codes = generateRecoveryCodes(4);
    const hashes = await hashRecoveryCodes(codes);
    const idx = await matchRecoveryCode(codes[2], hashes);
    expect(idx).toBe(2);
    hashes.splice(idx, 1);
    expect(await matchRecoveryCode(codes[2], hashes)).toBe(-1);
  });

  it("matches regardless of dashes/spaces, and returns -1 for unknown codes", async () => {
    const codes = generateRecoveryCodes(2);
    const hashes = await hashRecoveryCodes(codes);
    expect(await matchRecoveryCode(codes[0].replace("-", ""), hashes)).toBe(0);
    expect(await matchRecoveryCode("0000-0000", hashes)).toBe(-1);
  });
});

describe("isTotpEnforced", () => {
  const origEnv = process.env.NODE_ENV;
  const origOverride = process.env.TOTP_ENFORCE;
  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    if (origOverride === undefined) delete process.env.TOTP_ENFORCE;
    else process.env.TOTP_ENFORCE = origOverride;
  });

  it("is enforced in production, not in development", () => {
    delete process.env.TOTP_ENFORCE;
    process.env.NODE_ENV = "production";
    expect(isTotpEnforced()).toBe(true);
    process.env.NODE_ENV = "development";
    expect(isTotpEnforced()).toBe(false);
  });

  it("honours the explicit TOTP_ENFORCE override", () => {
    process.env.NODE_ENV = "development";
    process.env.TOTP_ENFORCE = "true";
    expect(isTotpEnforced()).toBe(true);
    process.env.NODE_ENV = "production";
    process.env.TOTP_ENFORCE = "false";
    expect(isTotpEnforced()).toBe(false);
  });
});
