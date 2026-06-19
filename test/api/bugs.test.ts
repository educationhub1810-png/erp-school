import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/bugs/route";
import { GET as GET_ID, PATCH, DELETE } from "@/app/api/v1/bugs/[id]/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeBug } from "../helpers/factories";

const BOARD_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"] as const;

function bugRow(over: Record<string, unknown> = {}) {
  return {
    ...makeBug(),
    schoolId: "school-1",
    reporterId: "user-1",
    whatNotWorking: "x",
    whatExpected: "y",
    screenshotUrl: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    school: { name: "DPS", code: "SCH001" },
    reporter: { name: "T", role: "TEACHER" },
    ...over,
  };
}

describe("GET /api/v1/bugs", () => {
  beforeEach(() => {
    prismaMock.bugTicket.findMany.mockResolvedValue([] as never);
  });

  it("enforces RBAC (board roles only)", async () => {
    await expectRbac(GET, [...BOARD_ROLES], () => buildRequest("/api/v1/bugs"));
  });
});

describe("POST /api/v1/bugs", () => {
  const validBody = {
    title: "Broken button",
    description: "It overflows",
    whatNotWorking: "Button overlaps text",
    whatExpected: "Button fits",
  };

  beforeEach(() => {
    prismaMock.bugTicket.create.mockResolvedValue(bugRow() as never);
  });

  it("enforces RBAC (board roles only)", async () => {
    await expectRbac(POST, [...BOARD_ROLES], () => buildRequest("/api/v1/bugs", { method: "POST", body: validBody }));
  });

  it("400s when a required narrative field is missing", async () => {
    setSession(sessionFor("PRINCIPAL", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/bugs", { method: "POST", body: { ...validBody, whatNotWorking: "" } }));
    expect(res.status).toBe(400);
  });

  it("creates a ticket and returns the list-view shape without the screenshot blob", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/bugs", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty("screenshotUrl");
    expect((res.body.data as { hasScreenshot: boolean }).hasScreenshot).toBe(false);
    // defaults priority to MEDIUM and stamps reporter from the session
    const data = prismaMock.bugTicket.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.priority).toBe("MEDIUM");
    expect(data.reporterId).toBe("user-school_admin");
  });
});

describe("GET /api/v1/bugs/[id]", () => {
  it("404s for a missing ticket", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.bugTicket.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(GET_ID, buildRequest("/api/v1/bugs/x"), paramsCtx({ id: "x" }));
    expect(res.status).toBe(404);
  });

  it("forbids viewing a ticket from another school (non-super-admin)", async () => {
    setSession(sessionFor("PRINCIPAL", { schoolId: "school-1" }));
    prismaMock.bugTicket.findUnique.mockResolvedValue(bugRow({ schoolId: "school-2" }) as never);
    const res = await callRoute(GET_ID, buildRequest("/api/v1/bugs/x"), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });

  it("returns the detail view for an in-school ticket", async () => {
    setSession(sessionFor("PRINCIPAL", { schoolId: "school-1" }));
    prismaMock.bugTicket.findUnique.mockResolvedValue(bugRow({ schoolId: "school-1" }) as never);
    const res = await callRoute(GET_ID, buildRequest("/api/v1/bugs/x"), paramsCtx({ id: "x" }));
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/v1/bugs/[id]", () => {
  it("only the SUPER_ADMIN may move tickets", async () => {
    prismaMock.bugTicket.findUnique.mockResolvedValue(bugRow() as never);
    prismaMock.bugTicket.update.mockResolvedValue(bugRow({ status: "RESOLVED" }) as never);
    await expectRbac(
      PATCH,
      ["SUPER_ADMIN"],
      () => buildRequest("/api/v1/bugs/x", { method: "PATCH", body: { status: "RESOLVED" } }),
      paramsCtx({ id: "x" }),
    );
  });

  it("400s when there is nothing to update", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(PATCH, buildRequest("/api/v1/bugs/x", { method: "PATCH", body: {} }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/bugs/[id]", () => {
  it("lets a reporter delete their own ticket and writes an audit log", async () => {
    setSession(sessionFor("PRINCIPAL", { schoolId: "school-1", id: "user-principal" }));
    prismaMock.bugTicket.findUnique.mockResolvedValue(bugRow({ reporterId: "user-principal" }) as never);
    prismaMock.bugTicket.delete.mockResolvedValue(bugRow() as never);
    prismaMock.auditLog.create.mockResolvedValue({} as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/bugs/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(200);
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it("forbids deleting a ticket reported by someone else (non-super-admin)", async () => {
    setSession(sessionFor("PRINCIPAL", { schoolId: "school-1", id: "user-principal" }));
    prismaMock.bugTicket.findUnique.mockResolvedValue(bugRow({ reporterId: "someone-else" }) as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/bugs/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });
});
