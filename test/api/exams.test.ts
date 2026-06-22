import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/exams/route";
import { GET as GET_ID, DELETE } from "@/app/api/v1/exams/[id]/route";
import { GET as GET_RESULTS, POST as POST_RESULTS } from "@/app/api/v1/exams/[id]/results/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeStudent } from "../helpers/factories";

const LIST_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"] as const;
const WRITE_ROLES = ["SCHOOL_ADMIN", "TEACHER"] as const;

function makeExam(over: Record<string, unknown> = {}) {
  return {
    id: "exam-1",
    schoolId: "school-1",
    classId: "class-1",
    name: "Unit Test 1",
    examType: "UNIT_TEST",
    startDate: new Date("2026-02-01"),
    endDate: new Date("2026-02-05"),
    isPublished: false,
    ...over,
  };
}

describe("GET /api/v1/exams", () => {
  beforeEach(() => {
    prismaMock.exam.findMany.mockResolvedValue([makeExam()] as never);
  });

  it("enforces RBAC (list roles only)", async () => {
    await expectRbac(GET, [...LIST_ROLES], () => buildRequest("/api/v1/exams"));
  });

  it("scopes the query to the caller's school and optional classId", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    await callRoute(GET, buildRequest("/api/v1/exams", { searchParams: { classId: "class-1" } }));
    const where = prismaMock.exam.findMany.mock.calls[0][0]!.where as Record<string, unknown>;
    expect(where.schoolId).toBe("school-1");
    expect(where.classId).toBe("class-1");
  });
});

describe("POST /api/v1/exams", () => {
  const validBody = {
    classId: "class-1",
    name: "Unit Test 1",
    examType: "UNIT_TEST",
  };

  beforeEach(() => {
    prismaMock.academicYear.findFirst.mockResolvedValue({ id: "ay-1" } as never);
    prismaMock.exam.create.mockResolvedValue(makeExam() as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    prismaMock.class.findFirst.mockResolvedValue({ id: "class-1", schoolId: "school-1", subjects: [] } as never);
    await expectRbac(POST, [...WRITE_ROLES], () => buildRequest("/api/v1/exams", { method: "POST", body: validBody }));
  });

  it("400s on a validation error (missing exam name)", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(POST, buildRequest("/api/v1/exams", { method: "POST", body: { ...validBody, name: "" } }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exam name is required/i);
  });

  it("rejects a class that does not belong to the caller's school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.class.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(POST, buildRequest("/api/v1/exams", { method: "POST", body: validBody }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/class/i);
  });

  it("creates the exam and generates ExamSchedule rows for the class's subjects", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.class.findFirst.mockResolvedValue({
      id: "class-1",
      schoolId: "school-1",
      subjects: [
        { id: "subject-1", totalMarks: 100, passMarks: 35 },
        { id: "subject-2", totalMarks: 50, passMarks: null },
      ],
    } as never);

    const res = await callRoute(POST, buildRequest("/api/v1/exams", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);

    expect(prismaMock.exam.create).toHaveBeenCalledOnce();
    const examData = prismaMock.exam.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(examData.schoolId).toBe("school-1");
    expect(examData.academicYearId).toBe("ay-1");

    expect(prismaMock.examSchedule.createMany).toHaveBeenCalledOnce();
    const scheduleArg = prismaMock.examSchedule.createMany.mock.calls[0][0]!.data as Array<Record<string, unknown>>;
    expect(scheduleArg).toHaveLength(2);
    expect(scheduleArg[0]).toMatchObject({ examId: "exam-1", subjectId: "subject-1", totalMarks: 100, passMarks: 35 });
    // passMarks falls back to round(totalMarks * 0.33) when the subject has none
    expect(scheduleArg[1]).toMatchObject({ examId: "exam-1", subjectId: "subject-2", totalMarks: 50, passMarks: Math.round(50 * 0.33) });
  });

  it("skips ExamSchedule generation when the class has no subjects", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.class.findFirst.mockResolvedValue({ id: "class-1", schoolId: "school-1", subjects: [] } as never);

    const res = await callRoute(POST, buildRequest("/api/v1/exams", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);
    expect(prismaMock.examSchedule.createMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/exams/[id]", () => {
  it("404s for a missing exam", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.exam.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(GET_ID, buildRequest("/api/v1/exams/x"), paramsCtx({ id: "x" }));
    expect(res.status).toBe(404);
  });

  it("forbids viewing another school's exam", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.exam.findUnique.mockResolvedValue(makeExam({ schoolId: "school-2" }) as never);
    const res = await callRoute(GET_ID, buildRequest("/api/v1/exams/x"), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });

  it("returns the exam with its schedules for an in-school caller", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.exam.findUnique.mockResolvedValue(makeExam({ schoolId: "school-1" }) as never);
    const res = await callRoute(GET_ID, buildRequest("/api/v1/exams/x"), paramsCtx({ id: "x" }));
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/v1/exams/[id]", () => {
  it("enforces RBAC (write roles only)", async () => {
    prismaMock.exam.findUnique.mockResolvedValue(makeExam({ schoolId: "school-1" }) as never);
    prismaMock.exam.delete.mockResolvedValue(makeExam() as never);
    await expectRbac(
      DELETE,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/exams/exam-1", { method: "DELETE" }),
      paramsCtx({ id: "exam-1" }),
    );
  });

  it("404s when the exam does not exist", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.exam.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/exams/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(404);
  });

  it("forbids deleting another school's exam", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.exam.findUnique.mockResolvedValue(makeExam({ schoolId: "school-2" }) as never);
    const res = await callRoute(DELETE, buildRequest("/api/v1/exams/x", { method: "DELETE" }), paramsCtx({ id: "x" }));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/exams/[id]/results", () => {
  beforeEach(() => {
    prismaMock.exam.findUnique.mockResolvedValue(makeExam({ schoolId: "school-1", classId: "class-1" }) as never);
    prismaMock.student.findMany.mockResolvedValue([
      { ...makeStudent(), examResults: [{ marksObtained: 80, isAbsent: false, remarks: "" }] },
    ] as never);
  });

  it("enforces RBAC (list roles only)", async () => {
    // The route forbids access when exam.schoolId !== user.schoolId with no
    // SUPER_ADMIN bypass, so pin schoolId for every role (including SUPER_ADMIN)
    // to match the mocked exam's school.
    await expectRbac(
      GET_RESULTS,
      [...LIST_ROLES],
      () => buildRequest("/api/v1/exams/exam-1/results", { searchParams: { scheduleId: "schedule-1" } }),
      paramsCtx({ id: "exam-1" }),
      { schoolId: "school-1" },
    );
  });

  it("400s when scheduleId is missing", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    const res = await callRoute(GET_RESULTS, buildRequest("/api/v1/exams/exam-1/results"), paramsCtx({ id: "exam-1" }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/scheduleid is required/i);
  });

  it("404s when the exam does not exist", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.exam.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(
      GET_RESULTS,
      buildRequest("/api/v1/exams/x/results", { searchParams: { scheduleId: "schedule-1" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(404);
  });

  it("forbids viewing results for another school's exam", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.exam.findUnique.mockResolvedValue(makeExam({ schoolId: "school-2" }) as never);
    const res = await callRoute(
      GET_RESULTS,
      buildRequest("/api/v1/exams/x/results", { searchParams: { scheduleId: "schedule-1" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(403);
  });

  it("returns per-student marks for the given schedule", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    const res = await callRoute(
      GET_RESULTS,
      buildRequest("/api/v1/exams/exam-1/results", { searchParams: { scheduleId: "schedule-1" } }),
      paramsCtx({ id: "exam-1" }),
    );
    expect(res.status).toBe(200);
    expect((res.body.data as Array<{ marksObtained: number }>)[0].marksObtained).toBe(80);
  });
});

describe("POST /api/v1/exams/[id]/results", () => {
  const validBody = {
    scheduleId: "schedule-1",
    results: [{ studentId: "student-1", marksObtained: 80 }],
  };

  beforeEach(() => {
    prismaMock.exam.findUnique.mockResolvedValue(makeExam({ schoolId: "school-1" }) as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    await expectRbac(
      POST_RESULTS,
      [...WRITE_ROLES],
      () => buildRequest("/api/v1/exams/exam-1/results", { method: "POST", body: validBody }),
      paramsCtx({ id: "exam-1" }),
    );
  });

  it("404s when the exam does not exist", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.exam.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(
      POST_RESULTS,
      buildRequest("/api/v1/exams/x/results", { method: "POST", body: validBody }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(404);
  });

  it("forbids saving results for another school's exam", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    prismaMock.exam.findUnique.mockResolvedValue(makeExam({ schoolId: "school-2" }) as never);
    const res = await callRoute(
      POST_RESULTS,
      buildRequest("/api/v1/exams/x/results", { method: "POST", body: validBody }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(403);
  });

  it("400s on a validation error (empty results array)", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    const res = await callRoute(
      POST_RESULTS,
      buildRequest("/api/v1/exams/exam-1/results", { method: "POST", body: { ...validBody, results: [] } }),
      paramsCtx({ id: "exam-1" }),
    );
    expect(res.status).toBe(400);
  });

  it("upserts results using the compound examScheduleId_studentId key", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST_RESULTS,
      buildRequest("/api/v1/exams/exam-1/results", { method: "POST", body: validBody }),
      paramsCtx({ id: "exam-1" }),
    );
    expect(res.status).toBe(200);
    expect((res.body.data as { saved: number }).saved).toBe(1);

    const upsertArgs = prismaMock.examResult.upsert.mock.calls[0][0]!;
    expect(upsertArgs.where).toEqual({
      examScheduleId_studentId: { examScheduleId: "schedule-1", studentId: "student-1" },
    });
    expect((upsertArgs.create as Record<string, unknown>).schoolId).toBe("school-1");
    expect((upsertArgs.create as Record<string, unknown>).examId).toBe("exam-1");
    expect((upsertArgs.update as Record<string, unknown>).marksObtained).toBe(80);
  });

  it("nulls marksObtained when a student is marked absent", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const body = {
      scheduleId: "schedule-1",
      results: [{ studentId: "student-1", marksObtained: 80, isAbsent: true }],
    };
    await callRoute(
      POST_RESULTS,
      buildRequest("/api/v1/exams/exam-1/results", { method: "POST", body }),
      paramsCtx({ id: "exam-1" }),
    );
    const upsertArgs = prismaMock.examResult.upsert.mock.calls[0][0]!;
    expect((upsertArgs.update as Record<string, unknown>).marksObtained).toBeNull();
    expect((upsertArgs.update as Record<string, unknown>).isAbsent).toBe(true);
  });
});
