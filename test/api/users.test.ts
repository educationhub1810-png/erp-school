import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/v1/users/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeUser } from "../helpers/factories";

describe("GET /api/v1/users", () => {
  it("enforces RBAC (Super Admin, School Admin, HR Manager only)", async () => {
    prismaMock.user.findMany.mockResolvedValue([] as never);
    await expectRbac(GET, ["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"], () => buildRequest("/api/v1/users"));
  });

  it("scopes a School Admin's listing to their own school, ignoring any schoolId query param", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.user.findMany.mockResolvedValue([] as never);

    await callRoute(GET, buildRequest("/api/v1/users", { searchParams: { schoolId: "school-2" } }));

    const args = prismaMock.user.findMany.mock.calls[0][0]!;
    expect((args.where as Record<string, unknown>).schoolId).toBe("school-1");
  });

  it("lets a Super Admin scope the listing via the schoolId query param", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.user.findMany.mockResolvedValue([] as never);

    await callRoute(GET, buildRequest("/api/v1/users", { searchParams: { schoolId: "school-9" } }));

    const args = prismaMock.user.findMany.mock.calls[0][0]!;
    expect((args.where as Record<string, unknown>).schoolId).toBe("school-9");
  });
});

describe("POST /api/v1/users", () => {
  it("enforces RBAC (Super Admin and School Admin only)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as never);
    prismaMock.user.create.mockResolvedValue(makeUser({ id: "user-new" }) as never);
    await expectRbac(
      POST,
      ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      () => buildRequest("/api/v1/users", { method: "POST", body: { name: "New Accountant", role: "ACCOUNTANT" } }),
    );
  });

  it("400s when a Super Admin omits schoolId", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/users", { method: "POST", body: { name: "New Principal", role: "PRINCIPAL", email: "principal@sch.com" } }),
    );
    expect(res.status).toBe(400);
  });

  it("400s on a duplicate email", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ email: "taken@sch.com" }) as never);

    const res = await callRoute(
      POST,
      buildRequest("/api/v1/users", { method: "POST", body: { name: "New Accountant", role: "ACCOUNTANT", email: "taken@sch.com" } }),
    );
    expect(res.status).toBe(400);
  });

  it("400s on an invalid mobile number", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/users", { method: "POST", body: { name: "New Accountant", role: "ACCOUNTANT", mobile: "12345" } }),
    );
    expect(res.status).toBe(400);
  });

  it("creates the user under the School Admin's own school for non-admin roles", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.user.findUnique.mockResolvedValue(null as never);
    prismaMock.user.create.mockResolvedValue(makeUser({ id: "user-new", role: "ACCOUNTANT" }) as never);

    const res = await callRoute(
      POST,
      buildRequest("/api/v1/users", { method: "POST", body: { name: "New Accountant", role: "ACCOUNTANT", email: "acc@sch.com" } }),
    );
    expect(res.status).toBe(201);

    const args = prismaMock.user.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(args.schoolId).toBe("school-1");
  });
});
