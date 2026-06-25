import { describe, it, expect, beforeEach } from "vitest";
import { authenticator } from "otplib";
import { passesSuperAdminGate, passesEnrolledTotpGate, verifyAnySuperAdminTotp } from "@/lib/super-admin-2fa";
import { encryptSecret } from "@/lib/totp";
import { prismaMock } from "../mocks/prisma";

const SECRET = "JBSWY3DPEHPK3PXP";

beforeEach(() => {
  process.env.TOTP_ENC_KEY = "acdc3b3417097e685ec95c7ec6251660e1eac6d0d0f07ccdab0909b8a4f53342";
});

function enrolled(over: Record<string, unknown> = {}) {
  return { id: "sa1", totpEnabled: true, totpSecret: encryptSecret(SECRET), totpRecoveryCodes: null, ...over };
}

describe("passesSuperAdminGate", () => {
  it("passes unconditionally when not enforced (localhost / password-only)", async () => {
    expect(await passesSuperAdminGate(null, undefined, false)).toBe(true);
    expect(await passesSuperAdminGate(enrolled(), "whatever", false)).toBe(true);
  });

  it("denies an un-enrolled super admin when enforced (no bypass)", async () => {
    const notEnrolled = { id: "sa1", totpEnabled: false, totpSecret: null, totpRecoveryCodes: null };
    expect(await passesSuperAdminGate(notEnrolled, "123456", true)).toBe(false);
    expect(await passesSuperAdminGate(null, "123456", true)).toBe(false);
  });

  it("requires a valid code for an enrolled super admin when enforced", async () => {
    const account = enrolled();
    expect(await passesSuperAdminGate(account, "000000", true)).toBe(false);
    expect(await passesSuperAdminGate(account, authenticator.generate(SECRET), true)).toBe(true);
  });
});

describe("passesEnrolledTotpGate (opt-in 2FA, e.g. school admins)", () => {
  it("passes when the account is not enrolled (password-only, no lockout)", async () => {
    const notEnrolled = { id: "u1", totpEnabled: false, totpSecret: null, totpRecoveryCodes: null };
    expect(await passesEnrolledTotpGate(notEnrolled, undefined)).toBe(true);
    expect(await passesEnrolledTotpGate(null, undefined)).toBe(true);
  });

  it("requires a valid code once enrolled — in every environment", async () => {
    const account = enrolled();
    expect(await passesEnrolledTotpGate(account, undefined)).toBe(false);
    expect(await passesEnrolledTotpGate(account, "000000")).toBe(false);
    expect(await passesEnrolledTotpGate(account, authenticator.generate(SECRET))).toBe(true);
  });
});

describe("verifyAnySuperAdminTotp", () => {
  it("returns false when no code is given", async () => {
    expect(await verifyAnySuperAdminTotp(undefined)).toBe(false);
  });

  it("matches a code against any enrolled super admin", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "sa1", totpSecret: encryptSecret("OTHERSECRET234"), totpRecoveryCodes: null },
      { id: "sa2", totpSecret: encryptSecret(SECRET), totpRecoveryCodes: null },
    ] as never);
    expect(await verifyAnySuperAdminTotp(authenticator.generate(SECRET))).toBe(true);
    // only queries TOTP-enrolled super admins
    expect(prismaMock.user.findMany.mock.calls[0][0]!.where).toMatchObject({ role: "SUPER_ADMIN", totpEnabled: true });
  });

  it("returns false when no enrolled admin matches", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "sa1", totpSecret: encryptSecret(SECRET), totpRecoveryCodes: null },
    ] as never);
    expect(await verifyAnySuperAdminTotp("000000")).toBe(false);
  });
});
