import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/subjects/route";
import { PUT, DELETE } from "@/app/api/v1/subjects/[id]/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeClass } from "../helpers/factories";

const LIST_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"] as const;
const WRITE_ROLES = ["SCHOOL_ADMIN"] as const;

function makeSubject(over: Record<string, unknown> = {}) {
  return {
    id: "subject-1",
    schoolId: "school-1",
    classId: "class-1",
    name: "Mathematics",
    code: "MATH",
    totalMarks: 100,
    passMarks: 33,
    teacherId: null,
    ...over,
  };
}

describe("GET /api/v1/subjects", () => {
  beforeEach(() => {
    prismaMock.subject.findMany.mockResolvedValue([makeSubject()] as never);
  });

  it("enforces RBAC (list roles only)", async () => {
    await expectRbac(GET, [...LIST_ROLES], () => buildRequest("/api/v1/subjects"));
  });

  it("scopes a SCHOOL_ADMIN to its own school, ignoring a ?schoolId override", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/subjects", { searchParams: { schoolId: "school-999" } }));
    const where = prismaMock.subject.findMany.mock.calls[0][0]!.where;
    expect(where!.schoolId).toBe("school-1");
  });

  it("lets a SUPER_ADMIN target any school via ?schoolId", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    await callRoute(GET, buildRequest("/api/v1/subjects", { searchParams: { schoolId: "school-42" } }));
    expect(prismaMock.subject.findMany.mock.calls[0][0]!.where!.schoolId).toBe("school-42");
  });

  it("filters by classId when provided", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/subjects", { searchParams: { classId: "class-5" } }));
    const where = prismaMock.subject.findMany.mock.calls[0][0]!.where as { classId?: string };
    expect(where.classId).toBe("class-5");
  });
});

describe("POST /api/v1/subjects", () => {
  const validBody = {
    classId: "class-1",
    name: "Mathematics",
  };

  beforeEach(() => {
    prismaMock.class.findFirst.mockResolvedValue(makeClass() as never);
    prismaMock.subject.create.mockResolvedValue(makeSubject() as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    await expectRbac(POST, [...WRITE_ROLES], () => buildRequest("/api/v1/subjects", { method: "POST", body: validBody }));
  });

  it("400s on a validation error (missing name)", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/subjects", { method: "POST", body: { ...validBody, name: "" } }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subject name is required/i);
  });

  it("400s when the name is over the max length", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/subjects", { method: "POST", body: { ...validBody, name: "a".repeat(101) } }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subject name is too long/i);
  });

  it("400s when totalMarks is over the max", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/subjects", { method: "POST", body: { ...validBody, totalMarks: 1001 } }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/total marks is too large/i);
  });

  it("rejects a class that does not belong to the school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.class.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(POST, buildRequest("/api/v1/subjects", { method: "POST", body: validBody }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/class/i);
  });

  it("rejects a teacher that does not belong to the school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.teacher.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(POST, buildRequest("/api/v1/subjects", { method: "POST", body: { ...validBody, teacherId: "teacher-9" } }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/teacher/i);
  });

  it("creates a subject scoped to the caller's school and returns 201", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/subjects", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);
    const data = prismaMock.subject.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.schoolId).toBe("school-1");
    expect(data.name).toBe("Mathematics");
    expect(data.totalMarks).toBe(100);
  });
});

describe("PUT /api/v1/subjects/[id]", () => {
  it("enforces RBAC (write roles only)", async () => {
    prismaMock.subject.findUnique.mockResolvedValue(makeSubject({ schoolId: "school-1" }) as never);
    prismaMock.subject.update.mockResolvedValue(makeSubject() as never);
    await expectRbac(
      PUT,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/subjects/subject-1", { method: "PUT", body: { name: "Science" } }),
      paramsCtx({ id: "subject-1" }),
    );
  });

  it("404s when the subject does not exist", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.subject.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/subjects/missing", { method: "PUT", body: { name: "Science" } }),
      paramsCtx({ id: "missing" }),
    );
    expect(res.status).toBe(404);
  });

  it("forbids a SCHOOL_ADMIN from editing another school's subject", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.subject.findUnique.mockResolvedValue(makeSubject({ schoolId: "school-2" }) as never);
    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/subjects/x", { method: "PUT", body: { name: "Science" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(403);
  });

  it("updates the subject", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.subject.findUnique.mockResolvedValue(makeSubject({ schoolId: "school-1" }) as never);
    prismaMock.subject.update.mockResolvedValue(makeSubject({ name: "Science" }) as never);
    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/subjects/subject-1", { method: "PUT", body: { name: "Science" } }),
      paramsCtx({ id: "subject-1" }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.subject.update.mock.calls[0][0]!.where).toEqual({ id: "subject-1" });
  });
});

describe("DELETE /api/v1/subjects/[id]", () => {
  it("enforces RBAC (write roles only)", async () => {
    prismaMock.subject.findUnique.mockResolvedValue(makeSubject({ schoolId: "school-1" }) as never);
    prismaMock.subject.delete.mockResolvedValue(makeSubject() as never);
    await expectRbac(
      DELETE,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/subjects/subject-1", { method: "DELETE" }),
      paramsCtx({ id: "subject-1" }),
    );
  });

  it("404s when the subject does not exist", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.subject.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/subjects/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(404);
  });

  it("forbids deleting another school's subject", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.subject.findUnique.mockResolvedValue(makeSubject({ schoolId: "school-2" }) as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/subjects/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });
});
