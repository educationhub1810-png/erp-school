import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";

import { POST } from "@/app/api/v1/users/[id]/totp/route";

const ENC_KEY = "acdc3b3417097e685ec95c7ec6251660e1eac6d0d0f07ccdab0909b8a4f53342";

function targetUser(overrides = {}) {
  return {
    id: "u1",
    email: "admin@dps.edu.in",
    role: "SCHOOL_ADMIN",
    schoolId: "school-1",
    totpEnabled: false,
    ...overrides,
  };
}

beforeEach(() => {
  process.env.TOTP_ENC_KEY = ENC_KEY;
  prismaMock.user.findUnique.mockResolvedValue(targetUser() as never);
  prismaMock.user.update.mockResolvedValue({} as never);
  prismaMock.auditLog.create.mockResolvedValue({} as never);
});

describe("POST /api/v1/users/[id]/totp", () => {
  it("only SUPER_ADMIN may call it", async () => {
    await expectRbac(
      POST,
      ["SUPER_ADMIN"],
      () => buildRequest("/api/v1/users/u1/totp", { method: "POST" }),
      paramsCtx({ id: "u1" }),
    );
  });

  it("returns 404 when the user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as never);
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(POST, buildRequest("/api/v1/users/missing/totp", { method: "POST" }), paramsCtx({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("refuses to target a SUPER_ADMIN account", async () => {
    prismaMock.user.findUnique.mockResolvedValue(targetUser({ role: "SUPER_ADMIN" }) as never);
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(POST, buildRequest("/api/v1/users/u1/totp", { method: "POST" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("enrolls the user: enables 2FA and stores an encrypted secret + hashed recovery codes", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute<{ qrDataUrl: string; secret: string; recoveryCodes: string[]; regenerated: boolean }>(
      POST,
      buildRequest("/api/v1/users/u1/totp", { method: "POST" }),
      paramsCtx({ id: "u1" }),
    );

    expect(res.status).toBe(200);
    // plaintext returned once
    expect(res.body.data!.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(res.body.data!.secret).toBeTruthy();
    expect(res.body.data!.recoveryCodes.length).toBeGreaterThan(0);
    expect(res.body.data!.regenerated).toBe(false);

    // stored values: enabled + non-plaintext credentials
    const { where, data } = prismaMock.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: "u1" });
    expect(data.totpEnabled).toBe(true);
    expect(typeof data.totpSecret).toBe("string");
    expect(data.totpSecret).not.toContain(res.body.data!.secret); // encrypted, not raw
    const hashes = JSON.parse(data.totpRecoveryCodes as string) as string[];
    expect(hashes).toHaveLength(res.body.data!.recoveryCodes.length);
    expect(hashes[0]).not.toBe(res.body.data!.recoveryCodes[0]); // hashed, not raw
  });

  it("reports regenerated=true when the user was already enrolled", async () => {
    prismaMock.user.findUnique.mockResolvedValue(targetUser({ totpEnabled: true }) as never);
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute<{ regenerated: boolean }>(
      POST,
      buildRequest("/api/v1/users/u1/totp", { method: "POST" }),
      paramsCtx({ id: "u1" }),
    );
    expect(res.body.data!.regenerated).toBe(true);
  });
});
