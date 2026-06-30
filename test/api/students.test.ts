import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/students/route";
import { PUT, DELETE } from "@/app/api/v1/students/[id]/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeStudent, makeClass, makeSchool, makeUser } from "../helpers/factories";

const LIST_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"] as const;
const WRITE_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;

describe("GET /api/v1/students", () => {
  beforeEach(() => {
    prismaMock.student.findMany.mockResolvedValue([makeStudent()] as never);
    prismaMock.student.count.mockResolvedValue(1 as never);
  });

  it("enforces RBAC (list roles only)", async () => {
    await expectRbac(GET, [...LIST_ROLES], () => buildRequest("/api/v1/students"));
  });

  it("scopes a SCHOOL_ADMIN to its own school, ignoring a ?schoolId override", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/students", { searchParams: { schoolId: "school-999" } }));
    const where = prismaMock.student.findMany.mock.calls[0][0]!.where;
    expect(where!.schoolId).toBe("school-1");
    expect(where!.isAlumni).toBe(false);
  });

  it("lets a SUPER_ADMIN target any school via ?schoolId", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    await callRoute(GET, buildRequest("/api/v1/students", { searchParams: { schoolId: "school-42" } }));
    expect(prismaMock.student.findMany.mock.calls[0][0]!.where!.schoolId).toBe("school-42");
  });

  it("redacts PII from the select for a TEACHER", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/students"));
    const select = prismaMock.student.findMany.mock.calls[0][0]!.select as Record<string, unknown>;
    expect(select.aadhaar).toBeUndefined();
    expect(select.medicalNotes).toBeUndefined();
  });

  it("includes PII in the select for a PRINCIPAL", async () => {
    setSession(sessionFor("PRINCIPAL", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/students"));
    const select = prismaMock.student.findMany.mock.calls[0][0]!.select as Record<string, unknown>;
    expect(select.aadhaar).toBe(true);
    expect(select.dob).toBe(true);
  });

  it("paginates: page 3 / limit 10 → skip 20, take 10, and returns totalPages", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.student.count.mockResolvedValue(25 as never);
    const res = await callRoute(GET, buildRequest("/api/v1/students", { searchParams: { page: "3", limit: "10" } }));
    const args = prismaMock.student.findMany.mock.calls[0][0]!;
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
    expect((res.body.data as { totalPages: number }).totalPages).toBe(3);
  });

  it("builds a case-insensitive OR search clause", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    await callRoute(GET, buildRequest("/api/v1/students", { searchParams: { search: "rah" } }));
    const where = prismaMock.student.findMany.mock.calls[0][0]!.where as { OR?: unknown[] };
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR!.length).toBeGreaterThan(0);
  });
});

describe("POST /api/v1/students", () => {
  const validBody = {
    firstName: "Rahul",
    lastName: "Verma",
    gender: "MALE",
    dob: "2010-05-01",
    classId: "class-1",
  };

  beforeEach(() => {
    prismaMock.class.findFirst.mockResolvedValue(makeClass() as never);
    prismaMock.school.findUnique.mockResolvedValue(makeSchool() as never);
    prismaMock.student.findMany.mockResolvedValue([] as never); // code generation
    prismaMock.user.create.mockResolvedValue(makeUser() as never);
    prismaMock.student.create.mockResolvedValue(makeStudent() as never);
    prismaMock.parent.create.mockResolvedValue({} as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    await expectRbac(POST, [...WRITE_ROLES], () => buildRequest("/api/v1/students", { method: "POST", body: validBody }));
  });

  it("400s on a validation error (missing first name)", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/students", { method: "POST", body: { ...validBody, firstName: "" } }));
    expect(res.status).toBe(400);
  });

  it("400s on a malformed mobile number", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/students", { method: "POST", body: { ...validBody, mobile: "12345" } }));
    expect(res.status).toBe(400);
  });

  it("400s on a malformed Aadhaar number", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/students", { method: "POST", body: { ...validBody, aadhaar: "123" } }));
    expect(res.status).toBe(400);
  });

  it("rejects a class that does not belong to the chosen school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.class.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(POST, buildRequest("/api/v1/students", { method: "POST", body: validBody }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/class does not belong/i);
  });

  it("creates a student + user account and returns 201", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/students", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
    expect(prismaMock.student.create).toHaveBeenCalledOnce();
    // user account gets the STUDENT role and a hashed password
    const userArg = prismaMock.user.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(userArg.role).toBe("STUDENT");
    expect(String(userArg.passwordHash)).not.toBe("Student@123");
  });

  it("400s on a malformed zip code", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/students", { method: "POST", body: { ...validBody, zipCode: "123" } }));
    expect(res.status).toBe(400);
  });

  it("persists the split address fields on the student record", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    await callRoute(POST, buildRequest("/api/v1/students", {
      method: "POST",
      body: { ...validBody, addressLine1: "221B Baker Street", addressLine2: "Near Park", zipCode: "110001", city: "New Delhi", state: "Delhi", country: "India" },
    }));
    const studentArg = prismaMock.student.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(studentArg.addressLine1).toBe("221B Baker Street");
    expect(studentArg.addressLine2).toBe("Near Park");
    expect(studentArg.zipCode).toBe("110001");
    expect(studentArg.city).toBe("New Delhi");
    expect(studentArg.state).toBe("Delhi");
    expect(studentArg.country).toBe("India");
  });

  it("creates a parent record only when parent info is provided", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    await callRoute(POST, buildRequest("/api/v1/students", { method: "POST", body: validBody }));
    expect(prismaMock.parent.create).not.toHaveBeenCalled();

    await callRoute(POST, buildRequest("/api/v1/students", { method: "POST", body: { ...validBody, fatherName: "Sanjay" } }));
    expect(prismaMock.parent.create).toHaveBeenCalledOnce();
  });

  it("requires a school when a SUPER_ADMIN omits schoolId", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(POST, buildRequest("/api/v1/students", { method: "POST", body: validBody }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/school is required/i);
  });
});

describe("PUT /api/v1/students/[id]", () => {
  it("enforces RBAC (write roles only)", async () => {
    // schoolId matches the SCHOOL_ADMIN session so it isn't rejected by tenancy.
    prismaMock.student.findUnique.mockResolvedValue(makeStudent({ schoolId: "school-1" }) as never);
    prismaMock.student.update.mockResolvedValue(makeStudent() as never);
    await expectRbac(
      PUT,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/students/student-1", { method: "PUT", body: { firstName: "New" } }),
      paramsCtx({ id: "student-1" }),
    );
  });

  it("404s when the student does not exist", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.student.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/students/missing", { method: "PUT", body: { firstName: "New" } }),
      paramsCtx({ id: "missing" }),
    );
    expect(res.status).toBe(404);
  });

  it("forbids a SCHOOL_ADMIN from editing another school's student", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.student.findUnique.mockResolvedValue(makeStudent({ schoolId: "school-2" }) as never);
    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/students/x", { method: "PUT", body: { firstName: "New" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(403);
  });

  it("400s on a malformed mobile number", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.student.findUnique.mockResolvedValue(makeStudent({ schoolId: "school-1" }) as never);
    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/students/student-1", { method: "PUT", body: { mobile: "12345" } }),
      paramsCtx({ id: "student-1" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/students/[id]", () => {
  it("enforces RBAC and cascades via the linked user account", async () => {
    prismaMock.student.findUnique.mockResolvedValue(
      makeStudent({ schoolId: "school-1", userId: "user-1" }) as never,
    );
    prismaMock.user.delete.mockResolvedValue(makeUser() as never);
    await expectRbac(
      DELETE,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/students/student-1", { method: "DELETE" }),
      paramsCtx({ id: "student-1" }),
    );
    expect(prismaMock.user.delete).toHaveBeenCalled();
  });
});
