import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/homework/route";
import { DELETE } from "@/app/api/v1/homework/[id]/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeClass, makeTeacher } from "../helpers/factories";

const LIST_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"] as const;
const WRITE_ROLES = ["TEACHER"] as const;

function makeHomework(over: Record<string, unknown> = {}) {
  return {
    id: "homework-1",
    schoolId: "school-1",
    classId: "class-1",
    sectionId: null,
    subjectId: null,
    teacherId: "teacher-1",
    title: "Chapter 4 worksheet",
    description: null,
    dueDate: null,
    attachmentUrl: null,
    ...over,
  };
}

describe("GET /api/v1/homework", () => {
  beforeEach(() => {
    prismaMock.homework.findMany.mockResolvedValue([makeHomework()] as never);
  });

  it("enforces RBAC (list roles only)", async () => {
    await expectRbac(GET, [...LIST_ROLES], () => buildRequest("/api/v1/homework"));
  });

  it("scopes to the caller's school", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/homework"));
    const where = prismaMock.homework.findMany.mock.calls[0][0]!.where as { schoolId?: string };
    expect(where.schoolId).toBe("school-1");
  });

  it("filters by classId when provided", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/homework", { searchParams: { classId: "class-5" } }));
    const where = prismaMock.homework.findMany.mock.calls[0][0]!.where as { classId?: string };
    expect(where.classId).toBe("class-5");
  });
});

describe("POST /api/v1/homework", () => {
  const validBody = {
    classId: "class-1",
    title: "Chapter 4 worksheet",
  };

  beforeEach(() => {
    prismaMock.class.findFirst.mockResolvedValue(makeClass() as never);
    prismaMock.teacher.findUnique.mockResolvedValue(makeTeacher({ id: "teacher-1" }) as never);
    prismaMock.homework.create.mockResolvedValue(makeHomework() as never);
  });

  it("enforces RBAC (TEACHER only)", async () => {
    await expectRbac(POST, [...WRITE_ROLES], () => buildRequest("/api/v1/homework", { method: "POST", body: validBody }));
  });

  it("400s on a validation error (missing title)", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/homework", { method: "POST", body: { ...validBody, title: "" } }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/i);
  });

  it("rejects a class that does not belong to the school", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.class.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(POST, buildRequest("/api/v1/homework", { method: "POST", body: validBody }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/class/i);
  });

  it("rejects a subject that does not belong to the school", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.subject.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(POST, buildRequest("/api/v1/homework", { method: "POST", body: { ...validBody, subjectId: "subject-9" } }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subject/i);
  });

  it("creates homework scoped to the caller's school and links the calling teacher", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1", id: "user-teacher" }));
    const res = await callRoute(POST, buildRequest("/api/v1/homework", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);
    const data = prismaMock.homework.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.schoolId).toBe("school-1");
    expect(data.title).toBe("Chapter 4 worksheet");
    expect(data.teacherId).toBe("teacher-1");
  });
});

describe("DELETE /api/v1/homework/[id]", () => {
  it("enforces RBAC (TEACHER only)", async () => {
    prismaMock.homework.findUnique.mockResolvedValue(makeHomework({ schoolId: "school-1" }) as never);
    prismaMock.homework.delete.mockResolvedValue(makeHomework() as never);
    await expectRbac(
      DELETE,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/homework/homework-1", { method: "DELETE" }),
      paramsCtx({ id: "homework-1" }),
    );
  });

  it("404s when the homework does not exist", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.homework.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/homework/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(404);
  });

  it("forbids deleting another school's homework", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.homework.findUnique.mockResolvedValue(makeHomework({ schoolId: "school-2" }) as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/homework/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });

  it("deletes the homework", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.homework.findUnique.mockResolvedValue(makeHomework({ schoolId: "school-1" }) as never);
    prismaMock.homework.delete.mockResolvedValue(makeHomework() as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/homework/homework-1", { method: "DELETE" }), paramsCtx({ id: "homework-1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.homework.delete.mock.calls[0][0]!.where).toEqual({ id: "homework-1" });
  });
});
