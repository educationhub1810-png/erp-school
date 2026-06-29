import { describe, it, expect, beforeEach, vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { GET, PUT } from "@/app/api/v1/settings/two-factor/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";

const path = "/api/v1/settings/two-factor";

function putReq(body: unknown) {
  return buildRequest(path, { method: "PUT", body });
}

beforeEach(() => {
  prismaMock.twoFactorPolicy.findMany.mockResolvedValue([] as never);
  prismaMock.twoFactorPolicy.upsert.mockResolvedValue({} as never);
  prismaMock.auditLog.create.mockResolvedValue({} as never);
});

describe("GET /api/v1/settings/two-factor", () => {
  it("is Super Admin only", async () => {
    await expectRbac(GET, ["SUPER_ADMIN"], () => buildRequest(path));
  });

  it("returns the per-role policy list", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(GET, buildRequest(path));
    expect(res.status).toBe(200);
    const data = res.body.data as { role: string; required: boolean; locked: boolean }[];
    expect(data).toHaveLength(12);
    expect(data.find((p) => p.role === "SUPER_ADMIN")).toMatchObject({ locked: true, required: true });
  });
});

describe("PUT /api/v1/settings/two-factor", () => {
  it("is Super Admin only", async () => {
    await expectRbac(PUT, ["SUPER_ADMIN"], () => putReq({ role: "SCHOOL_ADMIN", required: true }));
  });

  it("400s on an unknown role", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(PUT, putReq({ role: "WIZARD", required: true }));
    expect(res.status).toBe(400);
    expect(prismaMock.twoFactorPolicy.upsert).not.toHaveBeenCalled();
  });

  it("refuses to disable Super Admin 2FA", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(PUT, putReq({ role: "SUPER_ADMIN", required: false }));
    expect(res.status).toBe(400);
    expect(prismaMock.twoFactorPolicy.upsert).not.toHaveBeenCalled();
  });

  it("upserts the policy and writes an audit log", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(PUT, putReq({ role: "ACCOUNTANT", required: true }));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: "ACCOUNTANT", required: true });

    expect(prismaMock.twoFactorPolicy.upsert).toHaveBeenCalledOnce();
    const args = prismaMock.twoFactorPolicy.upsert.mock.calls[0][0]!;
    expect((args.where as { role: string }).role).toBe("ACCOUNTANT");
    expect(args.create).toMatchObject({ role: "ACCOUNTANT", required: true });

    expect(prismaMock.auditLog.create).toHaveBeenCalled();
    const audit = prismaMock.auditLog.create.mock.calls[0][0]!.data as { action: string };
    expect(audit.action).toBe("TWO_FACTOR_POLICY_UPDATE");
  });
});
