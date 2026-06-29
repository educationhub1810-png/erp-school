import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/parents/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeSchool, makeStudent, makeUser } from "../helpers/factories";

describe("GET /api/v1/parents", () => {
  beforeEach(() => {
    prismaMock.user.findMany.mockResolvedValue([] as never);
    prismaMock.user.count.mockResolvedValue(0 as never);
  });

  it("enforces RBAC (Super Admin, School Admin only)", async () => {
    await expectRbac(GET, ["SUPER_ADMIN", "SCHOOL_ADMIN"], () => buildRequest("/api/v1/parents"));
  });
});

describe("POST /api/v1/parents", () => {
  const validFather = {
    firstName: "Ramesh",
    lastName: "Verma",
    gender: "MALE",
  };

  beforeEach(() => {
    prismaMock.school.findUnique.mockResolvedValue(makeSchool() as never);
    prismaMock.student.findFirst.mockResolvedValue(makeStudent() as never);
    prismaMock.parentProfile.findMany.mockResolvedValue([] as never);
    prismaMock.user.create.mockResolvedValue(makeUser({ id: "user-new" }) as never);
    prismaMock.parentProfile.create.mockResolvedValue({} as never);
  });

  it("enforces RBAC (Super Admin, School Admin only)", async () => {
    await expectRbac(
      POST,
      ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      () => buildRequest("/api/v1/parents", { method: "POST", body: { studentId: "student-1", father: validFather } }),
    );
  });

  it("400s when none of father/mother/guardian are provided", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/parents", { method: "POST", body: { studentId: "student-1" } }));
    expect(res.status).toBe(400);
  });

  it("400s on an invalid mobile number for the father", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/parents", {
        method: "POST",
        body: { studentId: "student-1", father: { ...validFather, mobile: "12345" } },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400s on an invalid aadhaar number for the father", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/parents", {
        method: "POST",
        body: { studentId: "student-1", father: { ...validFather, aadhaar: "123" } },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a parent account for the School Admin's own school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/parents", { method: "POST", body: { studentId: "student-1", father: validFather } }),
    );
    expect(res.status).toBe(201);

    const args = prismaMock.user.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(args.schoolId).toBe("school-1");
  });
});
