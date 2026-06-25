import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/leave/route";
import { PATCH } from "@/app/api/v1/leave/[id]/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeLeaveRequest } from "../helpers/factories";

const APPLY_ROLES = ["TEACHER", "STUDENT"] as const;
const LIST_ROLES = ["TEACHER", "STUDENT", "PRINCIPAL"] as const;

describe("GET /api/v1/leave", () => {
  beforeEach(() => {
    prismaMock.leaveRequest.findMany.mockResolvedValue([makeLeaveRequest()] as never);
  });

  it("enforces RBAC (list roles only)", async () => {
    await expectRbac(GET, [...LIST_ROLES], () => buildRequest("/api/v1/leave"));
  });

  it("scope=mine returns only the caller's own requests in their school", async () => {
    setSession(sessionFor("STUDENT", { schoolId: "school-1", id: "user-student" }));
    await callRoute(GET, buildRequest("/api/v1/leave"));
    const where = prismaMock.leaveRequest.findMany.mock.calls[0][0]!.where as { userId?: string; schoolId?: string };
    expect(where.userId).toBe("user-student");
    expect(where.schoolId).toBe("school-1");
  });

  it("scope=approvals for a TEACHER lists STUDENT leave requests in their school", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/leave", { searchParams: { scope: "approvals" } }));
    const where = prismaMock.leaveRequest.findMany.mock.calls[0][0]!.where as { schoolId?: string; user?: { role?: string } };
    expect(where.schoolId).toBe("school-1");
    expect(where.user?.role).toBe("STUDENT");
  });

  it("scope=approvals for a PRINCIPAL lists TEACHER leave requests in their school", async () => {
    setSession(sessionFor("PRINCIPAL", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/leave", { searchParams: { scope: "approvals" } }));
    const where = prismaMock.leaveRequest.findMany.mock.calls[0][0]!.where as { user?: { role?: string } };
    expect(where.user?.role).toBe("TEACHER");
  });

  it("scope=approvals is forbidden for a STUDENT (students don't approve anything)", async () => {
    setSession(sessionFor("STUDENT", { schoolId: "school-1" }));
    const res = await callRoute(GET, buildRequest("/api/v1/leave", { searchParams: { scope: "approvals" } }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/leave", () => {
  const validBody = { fromDate: "2026-07-01", toDate: "2026-07-02", leaveType: "CASUAL", reason: "Family function" };

  beforeEach(() => {
    prismaMock.leaveRequest.create.mockResolvedValue(makeLeaveRequest() as never);
  });

  it("enforces RBAC (TEACHER and STUDENT only)", async () => {
    await expectRbac(POST, [...APPLY_ROLES], () => buildRequest("/api/v1/leave", { method: "POST", body: validBody }));
  });

  it("400s when the to date is before the from date", async () => {
    setSession(sessionFor("STUDENT", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/leave", { method: "POST", body: { ...validBody, fromDate: "2026-07-05", toDate: "2026-07-01" } }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/to date/i);
  });

  it("400s on a validation error (missing fromDate)", async () => {
    setSession(sessionFor("STUDENT", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/leave", { method: "POST", body: { ...validBody, fromDate: "" } }));
    expect(res.status).toBe(400);
  });

  it("creates the leave request scoped to the caller's school and user id", async () => {
    setSession(sessionFor("STUDENT", { schoolId: "school-1", id: "user-student" }));
    const res = await callRoute(POST, buildRequest("/api/v1/leave", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);
    const data = prismaMock.leaveRequest.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.schoolId).toBe("school-1");
    expect(data.userId).toBe("user-student");
    expect(data.leaveType).toBe("CASUAL");
  });
});

describe("PATCH /api/v1/leave/[id]", () => {
  beforeEach(() => {
    prismaMock.leaveRequest.update.mockResolvedValue(makeLeaveRequest({ status: "APPROVED" }) as never);
  });

  it("401s when signed out", async () => {
    setSession(null);
    const res = await callRoute(PATCH, buildRequest("/api/v1/leave/leave-1", { method: "PATCH", body: { status: "APPROVED" } }), paramsCtx({ id: "leave-1" }));
    expect(res.status).toBe(401);
  });

  it("403s roles that never decide leave requests (e.g. STUDENT)", async () => {
    setSession(sessionFor("STUDENT", { schoolId: "school-1" }));
    const res = await callRoute(PATCH, buildRequest("/api/v1/leave/leave-1", { method: "PATCH", body: { status: "APPROVED" } }), paramsCtx({ id: "leave-1" }));
    expect(res.status).toBe(403);
  });

  it("404s when the leave request does not exist", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.leaveRequest.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(PATCH, buildRequest("/api/v1/leave/x", { method: "PATCH", body: { status: "APPROVED" } }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(404);
  });

  it("403s on a cross-school leave request", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.leaveRequest.findUnique.mockResolvedValue(
      makeLeaveRequest({ schoolId: "school-2", user: { role: "STUDENT" } }) as never,
    );
    const res = await callRoute(PATCH, buildRequest("/api/v1/leave/leave-1", { method: "PATCH", body: { status: "APPROVED" } }), paramsCtx({ id: "leave-1" }));
    expect(res.status).toBe(403);
  });

  it("403s a TEACHER trying to decide a TEACHER's leave request (only PRINCIPAL can)", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.leaveRequest.findUnique.mockResolvedValue(
      makeLeaveRequest({ schoolId: "school-1", user: { role: "TEACHER" } }) as never,
    );
    const res = await callRoute(PATCH, buildRequest("/api/v1/leave/leave-1", { method: "PATCH", body: { status: "APPROVED" } }), paramsCtx({ id: "leave-1" }));
    expect(res.status).toBe(403);
  });

  it("403s a PRINCIPAL trying to decide a STUDENT's leave request (only TEACHER can)", async () => {
    setSession(sessionFor("PRINCIPAL", { schoolId: "school-1" }));
    prismaMock.leaveRequest.findUnique.mockResolvedValue(
      makeLeaveRequest({ schoolId: "school-1", user: { role: "STUDENT" } }) as never,
    );
    const res = await callRoute(PATCH, buildRequest("/api/v1/leave/leave-1", { method: "PATCH", body: { status: "APPROVED" } }), paramsCtx({ id: "leave-1" }));
    expect(res.status).toBe(403);
  });

  it("400s when the leave request has already been decided", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.leaveRequest.findUnique.mockResolvedValue(
      makeLeaveRequest({ schoolId: "school-1", status: "APPROVED", user: { role: "STUDENT" } }) as never,
    );
    const res = await callRoute(PATCH, buildRequest("/api/v1/leave/leave-1", { method: "PATCH", body: { status: "REJECTED" } }), paramsCtx({ id: "leave-1" }));
    expect(res.status).toBe(400);
  });

  it("a TEACHER approving a STUDENT's leave request records who approved it", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1", id: "user-teacher" }));
    prismaMock.leaveRequest.findUnique.mockResolvedValue(
      makeLeaveRequest({ schoolId: "school-1", status: "PENDING", user: { role: "STUDENT" } }) as never,
    );
    const res = await callRoute(PATCH, buildRequest("/api/v1/leave/leave-1", { method: "PATCH", body: { status: "APPROVED" } }), paramsCtx({ id: "leave-1" }));
    expect(res.status).toBe(200);
    const data = prismaMock.leaveRequest.update.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.status).toBe("APPROVED");
    expect(data.approvedById).toBe("user-teacher");
  });

  it("a PRINCIPAL rejecting a TEACHER's leave request records who decided it", async () => {
    setSession(sessionFor("PRINCIPAL", { schoolId: "school-1", id: "user-principal" }));
    prismaMock.leaveRequest.findUnique.mockResolvedValue(
      makeLeaveRequest({ schoolId: "school-1", status: "PENDING", user: { role: "TEACHER" } }) as never,
    );
    const res = await callRoute(PATCH, buildRequest("/api/v1/leave/leave-1", { method: "PATCH", body: { status: "REJECTED" } }), paramsCtx({ id: "leave-1" }));
    expect(res.status).toBe(200);
    const data = prismaMock.leaveRequest.update.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.status).toBe("REJECTED");
    expect(data.approvedById).toBe("user-principal");
  });
});
