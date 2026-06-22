import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/attendance/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeStudent } from "../helpers/factories";

const LIST_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"] as const;
const WRITE_ROLES = ["SCHOOL_ADMIN", "TEACHER"] as const;

describe("GET /api/v1/attendance", () => {
  beforeEach(() => {
    prismaMock.student.findMany.mockResolvedValue([
      { ...makeStudent(), attendance: [{ status: "PRESENT", remarks: "" }] },
    ] as never);
  });

  it("enforces RBAC (list roles only)", async () => {
    await expectRbac(GET, [...LIST_ROLES], () =>
      buildRequest("/api/v1/attendance", { searchParams: { classId: "class-1", date: "2026-01-01" } }),
    );
  });

  it("400s when classId or date is missing", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(GET, buildRequest("/api/v1/attendance", { searchParams: { classId: "class-1" } }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/classid and date are required/i);
  });

  it("scopes the query to the caller's school, class, and optional section", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    await callRoute(
      GET,
      buildRequest("/api/v1/attendance", { searchParams: { classId: "class-1", date: "2026-01-01", sectionId: "section-1" } }),
    );
    const where = prismaMock.student.findMany.mock.calls[0][0]!.where as Record<string, unknown>;
    expect(where.schoolId).toBe("school-1");
    expect(where.classId).toBe("class-1");
    expect(where.sectionId).toBe("section-1");
    expect(where.isAlumni).toBe(false);
  });

  it("defaults a student's status to PRESENT when there is no attendance record", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.student.findMany.mockResolvedValue([
      { ...makeStudent(), attendance: [] },
    ] as never);
    const res = await callRoute(GET, buildRequest("/api/v1/attendance", { searchParams: { classId: "class-1", date: "2026-01-01" } }));
    expect(res.status).toBe(200);
    expect((res.body.data as Array<{ status: string }>)[0].status).toBe("PRESENT");
  });
});

describe("POST /api/v1/attendance", () => {
  const validBody = {
    classId: "class-1",
    date: "2026-01-01",
    records: [{ studentId: "student-1", status: "PRESENT" }],
  };

  beforeEach(() => {
    prismaMock.academicYear.findFirst.mockResolvedValue({ id: "ay-1" } as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    await expectRbac(POST, [...WRITE_ROLES], () => buildRequest("/api/v1/attendance", { method: "POST", body: validBody }));
  });

  it("400s on a validation error (missing records)", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    const res = await callRoute(
      POST,
      buildRequest("/api/v1/attendance", { method: "POST", body: { ...validBody, records: [] } }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one student record is required/i);
  });

  it("upserts attendance using the compound studentId_date key, scoped to the caller's school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/attendance", { method: "POST", body: validBody }));
    expect(res.status).toBe(200);
    expect((res.body.data as { marked: number }).marked).toBe(1);

    const upsertArgs = prismaMock.attendance.upsert.mock.calls[0][0]!;
    expect(upsertArgs.where).toEqual({
      studentId_date: { studentId: "student-1", date: new Date("2026-01-01T00:00:00.000Z") },
    });
    expect((upsertArgs.create as Record<string, unknown>).schoolId).toBe("school-1");
    expect((upsertArgs.create as Record<string, unknown>).academicYearId).toBe("ay-1");
    expect((upsertArgs.update as Record<string, unknown>).status).toBe("PRESENT");
  });

  it("marks multiple students in one request via $transaction", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    const body = {
      classId: "class-1",
      date: "2026-01-01",
      records: [
        { studentId: "student-1", status: "PRESENT" },
        { studentId: "student-2", status: "ABSENT" },
      ],
    };
    const res = await callRoute(POST, buildRequest("/api/v1/attendance", { method: "POST", body }));
    expect(res.status).toBe(200);
    expect((res.body.data as { marked: number }).marked).toBe(2);
    expect(prismaMock.attendance.upsert).toHaveBeenCalledTimes(2);
  });
});
