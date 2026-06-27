import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import { buildRequest, callRoute } from "../helpers/request";

// All admin-access routes gate on a signed `admin_access` cookie (next/headers)
// compared against ADMIN_SECRET_CODE with a constant-time check.
let adminCookie: string | undefined;
const cookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: cookieSet,
    get: (name: string) =>
      name === "admin_access" && adminCookie !== undefined ? { value: adminCookie } : undefined,
  })),
}));

import { POST as verifyPOST } from "@/app/api/admin-access/verify/route";
import { POST as impersonatePOST } from "@/app/api/admin-access/impersonate/route";
import { GET as usersGET } from "@/app/api/admin-access/users/route";
import { createImpersonateToken } from "@/auth";

const SECRET = "test-admin-secret";

beforeEach(() => {
  process.env.ADMIN_SECRET_CODE = SECRET;
  adminCookie = SECRET; // valid by default; individual tests clear it
  cookieSet.mockClear();
});

describe("POST /api/admin-access/verify", () => {
  it("rejects a wrong code with 400 and sets no cookie", async () => {
    const res = await callRoute(verifyPOST, buildRequest("/api/admin-access/verify", { method: "POST", body: { code: "wrong" } }));
    expect(res.status).toBe(400);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("accepts the correct access code and sets the admin_access cookie", async () => {
    const res = await callRoute(verifyPOST, buildRequest("/api/admin-access/verify", { method: "POST", body: { code: SECRET } }));
    expect(res.status).toBe(200);
    expect((res.body.data as { verified: boolean }).verified).toBe(true);
    const [name, value, opts] = cookieSet.mock.calls[0];
    expect(name).toBe("admin_access");
    expect(value).toBe(SECRET);
    expect((opts as { httpOnly: boolean }).httpOnly).toBe(true);
  });
});

describe("POST /api/admin-access/impersonate", () => {
  beforeEach(() => {
    vi.mocked(createImpersonateToken).mockReturnValue("imp-token-123");
    prismaMock.auditLog.create.mockResolvedValue({} as never);
  });

  it("403s without a valid admin cookie", async () => {
    adminCookie = undefined;
    const res = await callRoute(impersonatePOST, buildRequest("/api/admin-access/impersonate", { method: "POST", body: { userId: "u1" } }));
    expect(res.status).toBe(403);
  });

  it("400s when userId is missing", async () => {
    const res = await callRoute(impersonatePOST, buildRequest("/api/admin-access/impersonate", { method: "POST", body: {} }));
    expect(res.status).toBe(400);
  });

  it("400s for an unknown or inactive user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(impersonatePOST, buildRequest("/api/admin-access/impersonate", { method: "POST", body: { userId: "missing" } }));
    expect(res.status).toBe(400);
  });

  it("issues a token, returns the role, and writes a SECURITY audit log", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", isActive: true, role: "TEACHER" } as never);
    const res = await callRoute(impersonatePOST, buildRequest("/api/admin-access/impersonate", { method: "POST", body: { userId: "u1" } }));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ token: "imp-token-123", role: "TEACHER" });
    expect(createImpersonateToken).toHaveBeenCalledWith("u1");
    const audit = prismaMock.auditLog.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(audit.action).toBe("IMPERSONATE_TOKEN_ISSUED");
    expect(audit.targetId).toBe("u1");
  });
});

describe("GET /api/admin-access/users", () => {
  beforeEach(() => {
    prismaMock.user.findMany.mockResolvedValue([] as never);
  });

  it("403s without a valid admin cookie", async () => {
    adminCookie = undefined;
    const res = await callRoute(usersGET, buildRequest("/api/admin-access/users", { searchParams: { role: "TEACHER" } }));
    expect(res.status).toBe(403);
  });

  it("400s when role is missing", async () => {
    const res = await callRoute(usersGET, buildRequest("/api/admin-access/users"));
    expect(res.status).toBe(400);
  });

  it("scopes non-super-admin roles to the given school", async () => {
    await callRoute(usersGET, buildRequest("/api/admin-access/users", { searchParams: { role: "TEACHER", schoolId: "school-1" } }));
    expect(prismaMock.user.findMany.mock.calls[0][0]!.where).toMatchObject({ role: "TEACHER", schoolId: "school-1", isActive: true });
  });

  it("defaults a school-less query to schoolId=null for non-super-admin roles", async () => {
    await callRoute(usersGET, buildRequest("/api/admin-access/users", { searchParams: { role: "TEACHER" } }));
    expect(prismaMock.user.findMany.mock.calls[0][0]!.where).toMatchObject({ role: "TEACHER", schoolId: null });
  });

  it("does not force schoolId=null for SUPER_ADMIN", async () => {
    await callRoute(usersGET, buildRequest("/api/admin-access/users", { searchParams: { role: "SUPER_ADMIN" } }));
    const where = prismaMock.user.findMany.mock.calls[0][0]!.where as Record<string, unknown>;
    expect(where.schoolId).toBeUndefined();
  });
});
