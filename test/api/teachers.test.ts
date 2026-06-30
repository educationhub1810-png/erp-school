import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/v1/teachers/route";
import { PUT, DELETE } from "@/app/api/v1/teachers/[id]/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeTeacher, makeUser } from "../helpers/factories";

const WRITE_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"] as const;

function makeTeacherWithUser(over: Record<string, unknown> = {}) {
  return makeTeacher({ userId: "user-1", user: { isActive: true }, ...over });
}

describe("POST /api/v1/teachers", () => {
  it("400s on a malformed mobile number", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));

    const res = await callRoute(
      POST,
      buildRequest("/api/v1/teachers", {
        method: "POST",
        body: { name: "New Teacher", mobile: "12345", dob: "1990-05-15" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400s when date of birth is missing", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));

    const res = await callRoute(
      POST,
      buildRequest("/api/v1/teachers", {
        method: "POST",
        body: { name: "New Teacher" },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/v1/teachers/[id]", () => {
  const validBody = { name: "Priya Updated", qualification: "M.Ed", experienceYears: 5 };

  it("enforces RBAC (write roles only)", async () => {
    prismaMock.teacher.findUnique.mockResolvedValue(makeTeacherWithUser({ schoolId: "school-1" }) as never);
    prismaMock.teacher.update.mockResolvedValue(makeTeacher() as never);
    prismaMock.user.update.mockResolvedValue(makeUser() as never);
    await expectRbac(
      PUT,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/teachers/teacher-1", { method: "PUT", body: validBody }),
      paramsCtx({ id: "teacher-1" }),
    );
  });

  it("404s when the teacher does not exist", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.teacher.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(PUT, buildRequest("/api/v1/teachers/missing", { method: "PUT", body: validBody }), paramsCtx({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("forbids a SCHOOL_ADMIN from editing another school's teacher", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.teacher.findUnique.mockResolvedValue(makeTeacherWithUser({ schoolId: "school-2" }) as never);
    const res = await callRoute(PUT, buildRequest("/api/v1/teachers/x", { method: "PUT", body: validBody }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });

  it("400s on a validation error (invalid email)", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.teacher.findUnique.mockResolvedValue(makeTeacherWithUser({ schoolId: "school-1" }) as never);
    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/teachers/teacher-1", { method: "PUT", body: { email: "not-an-email" } }),
      paramsCtx({ id: "teacher-1" }),
    );
    expect(res.status).toBe(400);
  });

  it("400s on a malformed Aadhaar number", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.teacher.findUnique.mockResolvedValue(makeTeacherWithUser({ schoolId: "school-1" }) as never);
    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/teachers/teacher-1", { method: "PUT", body: { aadhaar: "12345" } }),
      paramsCtx({ id: "teacher-1" }),
    );
    expect(res.status).toBe(400);
  });

  it("updates teacher fields and the linked user account", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.teacher.findUnique.mockResolvedValue(makeTeacherWithUser({ schoolId: "school-1", userId: "user-1" }) as never);
    prismaMock.teacher.update.mockResolvedValue(makeTeacher() as never);
    prismaMock.user.update.mockResolvedValue(makeUser() as never);

    const res = await callRoute(
      PUT,
      buildRequest("/api/v1/teachers/teacher-1", {
        method: "PUT",
        body: { name: "Priya Updated", email: "priya@sch001.com", qualification: "M.Ed", experienceYears: 5 },
      }),
      paramsCtx({ id: "teacher-1" }),
    );
    expect(res.status).toBe(200);

    const teacherData = prismaMock.teacher.update.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(teacherData.qualification).toBe("M.Ed");
    expect(teacherData.experienceYears).toBe(5);

    const userArgs = prismaMock.user.update.mock.calls[0][0]!;
    expect(userArgs.where).toEqual({ id: "user-1" });
    const userData = userArgs.data as Record<string, unknown>;
    expect(userData.name).toBe("Priya Updated");
    expect(userData.email).toBe("priya@sch001.com");
  });
});

describe("DELETE /api/v1/teachers/[id]", () => {
  it("deletes the linked user account, cascading the teacher record", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.teacher.findUnique.mockResolvedValue(
      makeTeacher({ schoolId: "school-1", userId: "user-1", user: { name: "Priya Singh" } }) as never,
    );
    prismaMock.user.delete.mockResolvedValue(makeUser() as never);

    const res = await callRoute(DELETE, buildRequest("/api/v1/teachers/teacher-1", { method: "DELETE" }), paramsCtx({ id: "teacher-1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("forbids a SCHOOL_ADMIN from deleting another school's teacher", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.teacher.findUnique.mockResolvedValue(makeTeacher({ schoolId: "school-2", user: { name: "X" } }) as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/teachers/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });
});
