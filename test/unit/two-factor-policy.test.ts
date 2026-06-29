import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import {
  isTwoFactorRequired,
  getTwoFactorPolicies,
} from "@/lib/two-factor-policy";

beforeEach(() => {
  delete process.env.OTP_DISABLE_FOR_E2E;
  prismaMock.twoFactorPolicy.findUnique.mockResolvedValue(null as never);
  prismaMock.twoFactorPolicy.findMany.mockResolvedValue([] as never);
});

afterEach(() => {
  delete process.env.OTP_DISABLE_FOR_E2E;
});

describe("isTwoFactorRequired", () => {
  it("always requires 2FA for Super Admin", async () => {
    expect(await isTwoFactorRequired("SUPER_ADMIN")).toBe(true);
  });

  it("falls back to the built-in default when no policy row exists", async () => {
    expect(await isTwoFactorRequired("SCHOOL_ADMIN")).toBe(true); // default-on
    expect(await isTwoFactorRequired("TEACHER")).toBe(false); // default-off
  });

  it("honours an explicit policy row over the default", async () => {
    prismaMock.twoFactorPolicy.findUnique.mockResolvedValue({ role: "SCHOOL_ADMIN", required: false } as never);
    expect(await isTwoFactorRequired("SCHOOL_ADMIN")).toBe(false);

    prismaMock.twoFactorPolicy.findUnique.mockResolvedValue({ role: "ACCOUNTANT", required: true } as never);
    expect(await isTwoFactorRequired("ACCOUNTANT")).toBe(true);
  });

  it("is globally disabled by the e2e kill switch", async () => {
    process.env.OTP_DISABLE_FOR_E2E = "1";
    expect(await isTwoFactorRequired("SUPER_ADMIN")).toBe(false);
    expect(await isTwoFactorRequired("SCHOOL_ADMIN")).toBe(false);
  });
});

describe("getTwoFactorPolicies", () => {
  it("returns every role with Super Admin locked on", async () => {
    const policies = await getTwoFactorPolicies();
    expect(policies).toHaveLength(12);

    const sa = policies.find((p) => p.role === "SUPER_ADMIN")!;
    expect(sa).toMatchObject({ required: true, locked: true });

    const teacher = policies.find((p) => p.role === "TEACHER")!;
    expect(teacher).toMatchObject({ required: false, locked: false });
  });

  it("overlays explicit rows on the defaults", async () => {
    prismaMock.twoFactorPolicy.findMany.mockResolvedValue([
      { role: "ACCOUNTANT", required: true },
      { role: "SCHOOL_ADMIN", required: false },
    ] as never);

    const policies = await getTwoFactorPolicies();
    expect(policies.find((p) => p.role === "ACCOUNTANT")!.required).toBe(true);
    expect(policies.find((p) => p.role === "SCHOOL_ADMIN")!.required).toBe(false);
  });
});
