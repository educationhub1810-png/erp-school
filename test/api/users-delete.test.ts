import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";

import { DELETE } from "@/app/api/v1/users/[id]/route";

function targetUser(overrides = {}) {
  return {
    id: "u1",
    name: "Jane Teacher",
    role: "TEACHER",
    schoolId: "school-1",
    ...overrides,
  };
}

beforeEach(() => {
  prismaMock.user.findUnique.mockResolvedValue(targetUser() as never);
  prismaMock.announcement.deleteMany.mockResolvedValue({ count: 0 } as never);
  prismaMock.user.delete.mockResolvedValue(targetUser() as never);
  prismaMock.auditLog.create.mockResolvedValue({} as never);
});

describe("DELETE /api/v1/users/[id]", () => {
  it("only SUPER_ADMIN and SCHOOL_ADMIN may call it", async () => {
    await expectRbac(
      DELETE,
      ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      () => buildRequest("/api/v1/users/u1", { method: "DELETE" }),
      paramsCtx({ id: "u1" }),
    );
  });

  it("returns 404 when the user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as never);
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(DELETE, buildRequest("/api/v1/users/missing", { method: "DELETE" }), paramsCtx({ id: "missing" }));
    expect(res.status).toBe(404);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("refuses to delete the actor's own account", async () => {
    prismaMock.user.findUnique.mockResolvedValue(targetUser({ id: "user-super_admin", role: "SUPER_ADMIN" }) as never);
    setSession(sessionFor("SUPER_ADMIN")); // id === "user-super_admin"
    const res = await callRoute(DELETE, buildRequest("/api/v1/users/user-super_admin", { method: "DELETE" }), paramsCtx({ id: "user-super_admin" }));
    expect(res.status).toBe(403);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("super admin can delete any user, clearing authored announcements first", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(DELETE, buildRequest("/api/v1/users/u1", { method: "DELETE" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.announcement.deleteMany).toHaveBeenCalledWith({ where: { createdById: "u1" } });
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("school admin may delete a user within their own school", async () => {
    prismaMock.user.findUnique.mockResolvedValue(targetUser({ schoolId: "school-1" }) as never);
    setSession(sessionFor("SCHOOL_ADMIN")); // schoolId === "school-1"
    const res = await callRoute(DELETE, buildRequest("/api/v1/users/u1", { method: "DELETE" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("school admin cannot delete a user from another school", async () => {
    prismaMock.user.findUnique.mockResolvedValue(targetUser({ schoolId: "school-2" }) as never);
    setSession(sessionFor("SCHOOL_ADMIN")); // schoolId === "school-1"
    const res = await callRoute(DELETE, buildRequest("/api/v1/users/u1", { method: "DELETE" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(404);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("school admin cannot delete a SUPER_ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValue(targetUser({ role: "SUPER_ADMIN", schoolId: null }) as never);
    setSession(sessionFor("SCHOOL_ADMIN"));
    const res = await callRoute(DELETE, buildRequest("/api/v1/users/u1", { method: "DELETE" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(403);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });
});
