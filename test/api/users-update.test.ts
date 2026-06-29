import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";

import { PATCH } from "@/app/api/v1/users/[id]/route";

function targetUser(overrides = {}) {
  return {
    id: "u1",
    name: "Jane Teacher",
    role: "TEACHER",
    schoolId: "school-1",
    email: "old@sch001.com",
    mobile: null,
    ...overrides,
  };
}

function patch(body: unknown, id = "u1") {
  return buildRequest(`/api/v1/users/${id}`, { method: "PATCH", body });
}

beforeEach(() => {
  prismaMock.user.findUnique.mockResolvedValue(targetUser() as never);
  prismaMock.user.findFirst.mockResolvedValue(null as never); // no email clash
  prismaMock.user.update.mockResolvedValue(targetUser({ email: "new@sch001.com" }) as never);
  prismaMock.auditLog.create.mockResolvedValue({} as never);
});

describe("PATCH /api/v1/users/[id]", () => {
  it("only SUPER_ADMIN and SCHOOL_ADMIN may call it", async () => {
    await expectRbac(
      PATCH,
      ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      () => patch({ email: "new@sch001.com" }),
      paramsCtx({ id: "u1" }),
    );
  });

  it("400s on an invalid email", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(PATCH, patch({ email: "not-an-email" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("404s when the user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as never);
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(PATCH, patch({ email: "new@sch001.com" }, "missing"), paramsCtx({ id: "missing" }));
    expect(res.status).toBe(404);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("updates the email (normalised) and writes an audit log", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(PATCH, patch({ email: "New@SCH001.com" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(200);

    const args = prismaMock.user.update.mock.calls[0][0]!;
    expect((args.where as { id: string }).id).toBe("u1");
    expect((args.data as { email: string }).email).toBe("new@sch001.com"); // trimmed + lowercased
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
    expect((prismaMock.auditLog.create.mock.calls[0][0]!.data as { action: string }).action).toBe("USER_UPDATE");
  });

  it("clears the email when an empty string is sent", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(PATCH, patch({ email: "" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(200);
    expect((prismaMock.user.update.mock.calls[0][0]!.data as { email: string | null }).email).toBeNull();
  });

  it("rejects an email already used by another account", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "other" } as never);
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(PATCH, patch({ email: "taken@sch001.com" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("lets a school admin edit a user in their own school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN")); // schoolId "school-1"
    const res = await callRoute(PATCH, patch({ name: "Janet" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it("forbids a school admin editing a SUPER_ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValue(targetUser({ role: "SUPER_ADMIN", schoolId: null }) as never);
    setSession(sessionFor("SCHOOL_ADMIN"));
    const res = await callRoute(PATCH, patch({ email: "x@y.com" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("404s for a school admin editing a user in another school", async () => {
    prismaMock.user.findUnique.mockResolvedValue(targetUser({ schoolId: "school-2" }) as never);
    setSession(sessionFor("SCHOOL_ADMIN"));
    const res = await callRoute(PATCH, patch({ name: "X" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(404);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
