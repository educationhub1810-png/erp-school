import { describe, it, expect } from "vitest";
import { PUT, DELETE } from "@/app/api/v1/staff/[id]/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeStaff, makeUser } from "../helpers/factories";

const WRITE_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"] as const;

describe("PUT /api/v1/staff/[id]", () => {
  const validBody = { name: "Rekha Updated", department: "Finance", experienceYears: 9 };

  it("enforces RBAC (write roles only)", async () => {
    prismaMock.staff.findUnique.mockResolvedValue(makeStaff({ schoolId: "school-1" }) as never);
    prismaMock.staff.update.mockResolvedValue(makeStaff() as never);
    prismaMock.user.update.mockResolvedValue(makeUser() as never);
    await expectRbac(
      PUT,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/staff/staff-1", { method: "PUT", body: validBody }),
      paramsCtx({ id: "staff-1" }),
    );
  });

  it("404s when the staff record does not exist", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.staff.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(PUT, buildRequest("/api/v1/staff/missing", { method: "PUT", body: validBody }), paramsCtx({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("forbids a SCHOOL_ADMIN from editing another school's staff", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.staff.findUnique.mockResolvedValue(makeStaff({ schoolId: "school-2" }) as never);
    const res = await callRoute(PUT, buildRequest("/api/v1/staff/x", { method: "PUT", body: validBody }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });

  it("lets a SUPER_ADMIN edit staff in any school", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.staff.findUnique.mockResolvedValue(makeStaff({ schoolId: "school-2" }) as never);
    prismaMock.staff.update.mockResolvedValue(makeStaff() as never);
    const res = await callRoute(PUT, buildRequest("/api/v1/staff/x", { method: "PUT", body: validBody }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(200);
  });

  it("400s on a validation error (invalid email)", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.staff.findUnique.mockResolvedValue(makeStaff({ schoolId: "school-1" }) as never);
    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/staff/staff-1", { method: "PUT", body: { email: "not-an-email" } }),
      paramsCtx({ id: "staff-1" }),
    );
    expect(res.status).toBe(400);
  });

  it("updates staff role-specific fields and the linked user account", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.staff.findUnique.mockResolvedValue(makeStaff({ schoolId: "school-1", userId: "user-1" }) as never);
    prismaMock.staff.update.mockResolvedValue(makeStaff() as never);
    prismaMock.user.update.mockResolvedValue(makeUser() as never);

    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/staff/staff-1", {
        method: "PUT",
        body: { name: "Rekha Updated", email: "rekha@sch001.com", department: "Finance", experienceYears: 9 },
      }),
      paramsCtx({ id: "staff-1" }),
    );
    expect(res.status).toBe(200);

    const staffData = prismaMock.staff.update.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(staffData.department).toBe("Finance");
    expect(staffData.experienceYears).toBe(9);

    const userArgs = prismaMock.user.update.mock.calls[0][0]!;
    expect(userArgs.where).toEqual({ id: "user-1" });
    const userData = userArgs.data as Record<string, unknown>;
    expect(userData.name).toBe("Rekha Updated");
    expect(userData.email).toBe("rekha@sch001.com");
  });
});

describe("DELETE /api/v1/staff/[id]", () => {
  it("deletes the linked user account, cascading the staff record", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.staff.findUnique.mockResolvedValue(makeStaff({ schoolId: "school-1", userId: "user-1" }) as never);
    prismaMock.user.delete.mockResolvedValue(makeUser() as never);

    const res = await callRoute(DELETE, buildRequest("/api/v1/staff/staff-1", { method: "DELETE" }), paramsCtx({ id: "staff-1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("forbids a SCHOOL_ADMIN from deleting another school's staff", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.staff.findUnique.mockResolvedValue(makeStaff({ schoolId: "school-2" }) as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/staff/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });
});
