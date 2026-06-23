import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/timetable/route";
import { PUT, DELETE } from "@/app/api/v1/timetable/[id]/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";

const LIST_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT"] as const;
const WRITE_ROLES = ["SCHOOL_ADMIN", "TEACHER"] as const;

function makeSlot(over: Record<string, unknown> = {}) {
  return {
    id: "slot-1",
    schoolId: "school-1",
    classId: "class-1",
    sectionId: null,
    subjectId: "subject-1",
    teacherId: "teacher-1",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "09:45",
    ...over,
  };
}

describe("GET /api/v1/timetable", () => {
  beforeEach(() => {
    prismaMock.timetable.findMany.mockResolvedValue([makeSlot()] as never);
  });

  it("enforces RBAC (broad list roles)", async () => {
    await expectRbac(GET, [...LIST_ROLES], () => buildRequest("/api/v1/timetable", { searchParams: { classId: "class-1" } }));
  });

  it("400s when classId is missing", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    const res = await callRoute(GET, buildRequest("/api/v1/timetable"));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/classid is required/i);
  });

  it("scopes the query to the caller's school, class, and optional section", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/timetable", { searchParams: { classId: "class-1", sectionId: "section-1" } }));
    const where = prismaMock.timetable.findMany.mock.calls[0][0]!.where as Record<string, unknown>;
    expect(where.schoolId).toBe("school-1");
    expect(where.classId).toBe("class-1");
    expect(where.sectionId).toBe("section-1");
  });
});

describe("POST /api/v1/timetable", () => {
  const validBody = {
    classId: "class-1",
    subjectId: "subject-1",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "09:45",
  };

  beforeEach(() => {
    prismaMock.subject.findFirst.mockResolvedValue({ id: "subject-1", teacherId: "teacher-default" } as never);
    prismaMock.timetable.create.mockResolvedValue(makeSlot() as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    await expectRbac(POST, [...WRITE_ROLES], () => buildRequest("/api/v1/timetable", { method: "POST", body: validBody }));
  });

  it("400s on a validation error (missing start time)", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/timetable", { method: "POST", body: { ...validBody, startTime: "" } }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/start time is required/i);
  });

  it("rejects a subject that does not belong to the caller's school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.subject.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(POST, buildRequest("/api/v1/timetable", { method: "POST", body: validBody }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subject/i);
  });

  it("falls back to the subject's teacher when teacherId is omitted", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/timetable", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);
    const data = prismaMock.timetable.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.schoolId).toBe("school-1");
    expect(data.teacherId).toBe("teacher-default");
  });

  it("uses the explicit teacherId when provided", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/timetable", { method: "POST", body: { ...validBody, teacherId: "teacher-explicit" } }),
    );
    expect(res.status).toBe(201);
    const data = prismaMock.timetable.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.teacherId).toBe("teacher-explicit");
  });
});

describe("PUT /api/v1/timetable/[id]", () => {
  const validBody = { subjectId: "subject-2", dayOfWeek: 2, startTime: "10:00", endTime: "10:45" };

  beforeEach(() => {
    prismaMock.timetable.findUnique.mockResolvedValue(makeSlot({ schoolId: "school-1" }) as never);
    prismaMock.subject.findFirst.mockResolvedValue({ id: "subject-2" } as never);
    prismaMock.timetable.update.mockResolvedValue(makeSlot({ ...validBody }) as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    await expectRbac(
      PUT,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/timetable/slot-1", { method: "PUT", body: validBody }),
      paramsCtx({ id: "slot-1" }),
    );
  });

  it("404s when the slot does not exist", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.timetable.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(PUT, buildRequest("/api/v1/timetable/x", { method: "PUT", body: validBody }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(404);
  });

  it("forbids updating another school's slot", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.timetable.findUnique.mockResolvedValue(makeSlot({ schoolId: "school-2" }) as never);
    const res = await callRoute(PUT, buildRequest("/api/v1/timetable/x", { method: "PUT", body: validBody }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });

  it("rejects a subject that does not belong to the caller's school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.subject.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(PUT, buildRequest("/api/v1/timetable/slot-1", { method: "PUT", body: validBody }), paramsCtx({ id: "slot-1" }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subject/i);
  });

  it("updates the slot's subject, day, and time", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(PUT, buildRequest("/api/v1/timetable/slot-1", { method: "PUT", body: validBody }), paramsCtx({ id: "slot-1" }));
    expect(res.status).toBe(200);
    const data = prismaMock.timetable.update.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.subjectId).toBe("subject-2");
    expect(data.dayOfWeek).toBe(2);
    expect(data.startTime).toBe("10:00");
    expect(data.endTime).toBe("10:45");
  });
});

describe("DELETE /api/v1/timetable/[id]", () => {
  it("enforces RBAC (write roles only)", async () => {
    prismaMock.timetable.findUnique.mockResolvedValue(makeSlot({ schoolId: "school-1" }) as never);
    prismaMock.timetable.delete.mockResolvedValue(makeSlot() as never);
    await expectRbac(
      DELETE,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/timetable/slot-1", { method: "DELETE" }),
      paramsCtx({ id: "slot-1" }),
    );
  });

  it("404s when the slot does not exist", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.timetable.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/timetable/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(404);
  });

  it("forbids deleting another school's slot", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.timetable.findUnique.mockResolvedValue(makeSlot({ schoolId: "school-2" }) as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/timetable/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });
});
