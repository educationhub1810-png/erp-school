import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import { buildRequest, callRoute } from "../helpers/request";

// admin-access/verify uses next/headers cookies() — mock it.
const cookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: cookieSet })),
}));

import { GET as publicSchoolsGET } from "@/app/api/public/schools/route";
import { POST as verifyPOST } from "@/app/api/admin-access/verify/route";

describe("GET /api/public/schools (no auth)", () => {
  it("returns only active schools with minimal public fields", async () => {
    prismaMock.school.findMany.mockResolvedValue([
      { id: "s1", name: "DPS", code: "SCH001" },
    ] as never);
    const res = await callRoute(publicSchoolsGET, buildRequest("/api/public/schools"));
    expect(res.status).toBe(200);
    expect(prismaMock.school.findMany.mock.calls[0][0]!.where).toEqual({ isActive: true });
    expect((res.body.data as unknown[])).toHaveLength(1);
  });
});

describe("POST /api/admin-access/verify", () => {
  beforeEach(() => {
    cookieSet.mockClear();
    process.env.ADMIN_SECRET_CODE = "test-admin-secret";
  });

  it("rejects a wrong code with 400 and sets no cookie", async () => {
    const res = await callRoute(verifyPOST, buildRequest("/api/admin-access/verify", { method: "POST", body: { code: "wrong" } }));
    expect(res.status).toBe(400);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("accepts the correct code, sets an httpOnly cookie, returns verified", async () => {
    const res = await callRoute(verifyPOST, buildRequest("/api/admin-access/verify", { method: "POST", body: { code: "test-admin-secret" } }));
    expect(res.status).toBe(200);
    expect((res.body.data as { verified: boolean }).verified).toBe(true);
    expect(cookieSet).toHaveBeenCalledOnce();
    const [name, value, opts] = cookieSet.mock.calls[0];
    expect(name).toBe("admin_access");
    expect(value).toBe("test-admin-secret");
    expect((opts as { httpOnly: boolean }).httpOnly).toBe(true);
  });
});
