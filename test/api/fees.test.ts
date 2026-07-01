import { describe, it, expect, beforeEach } from "vitest";
import { POST as POST_STRUCTURE } from "@/app/api/v1/fees/structures/route";
import { POST as POST_PAYMENT } from "@/app/api/v1/fees/payments/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeClass, makeStudent, makeSchool } from "../helpers/factories";

const WRITE_ROLES = ["SCHOOL_ADMIN", "TEACHER"] as const;

function makeFeeStructure(over: Record<string, unknown> = {}) {
  return {
    id: "fee-structure-1",
    schoolId: "school-1",
    classId: null,
    academicYearId: "ay-1",
    feeType: "Tuition",
    amount: 5000,
    frequency: "MONTHLY",
    description: null,
    ...over,
  };
}

function makeFeePayment(over: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    schoolId: "school-1",
    studentId: "student-1",
    feeStructureId: "fee-structure-1",
    amountPaid: 5000,
    receiptNumber: "RCPT-SCH001-12345678",
    paymentMode: "CASH",
    status: "PAID",
    ...over,
  };
}

describe("POST /api/v1/fees/structures", () => {
  const validBody = {
    feeType: "Tuition",
    amount: 5000,
    frequency: "MONTHLY",
  };

  it("accepts HALF_YEARLY as a valid frequency", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST_STRUCTURE,
      buildRequest("/api/v1/fees/structures", { method: "POST", body: { ...validBody, frequency: "HALF_YEARLY", monthlyDueDay: undefined } }),
    );
    expect(res.status).toBe(201);
  });

  beforeEach(() => {
    prismaMock.academicYear.findFirst.mockResolvedValue({ id: "ay-1" } as never);
    prismaMock.feeStructure.create.mockResolvedValue(makeFeeStructure() as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    await expectRbac(POST_STRUCTURE, [...WRITE_ROLES], () =>
      buildRequest("/api/v1/fees/structures", { method: "POST", body: validBody }),
    );
  });

  it("400s on a validation error (missing fee type)", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST_STRUCTURE,
      buildRequest("/api/v1/fees/structures", { method: "POST", body: { ...validBody, feeType: "" } }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fee type is required/i);
  });

  it("400s when amount is not positive", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST_STRUCTURE,
      buildRequest("/api/v1/fees/structures", { method: "POST", body: { ...validBody, amount: 0 } }),
    );
    expect(res.status).toBe(400);
  });

  it("400s when amount is over the max", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST_STRUCTURE,
      buildRequest("/api/v1/fees/structures", { method: "POST", body: { ...validBody, amount: 10_000_001 } }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount is too large/i);
  });

  it("400s when the fee type is over the max length", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST_STRUCTURE,
      buildRequest("/api/v1/fees/structures", { method: "POST", body: { ...validBody, feeType: "a".repeat(101) } }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fee type is too long/i);
  });

  it("rejects a class that does not belong to the school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.class.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(
      POST_STRUCTURE,
      buildRequest("/api/v1/fees/structures", { method: "POST", body: { ...validBody, classId: "class-9" } }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/class/i);
  });

  it("creates a fee structure scoped to the caller's school and returns 201", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.class.findFirst.mockResolvedValue(makeClass() as never);
    const res = await callRoute(
      POST_STRUCTURE,
      buildRequest("/api/v1/fees/structures", { method: "POST", body: { ...validBody, classId: "class-1" } }),
    );
    expect(res.status).toBe(201);
    const data = prismaMock.feeStructure.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.schoolId).toBe("school-1");
    expect(data.academicYearId).toBe("ay-1");
    expect(data.feeType).toBe("Tuition");
  });
});

describe("POST /api/v1/fees/payments", () => {
  const validBody = {
    studentId: "student-1",
    feeStructureId: "fee-structure-1",
    amountPaid: 5000,
    paymentMode: "CASH",
    status: "PAID",
  };

  beforeEach(() => {
    prismaMock.student.findFirst.mockResolvedValue(makeStudent({ schoolId: "school-1" }) as never);
    prismaMock.feeStructure.findFirst.mockResolvedValue(makeFeeStructure({ schoolId: "school-1" }) as never);
    prismaMock.school.findUnique.mockResolvedValue(makeSchool({ code: "SCH001" }) as never);
    prismaMock.feePayment.create.mockResolvedValue(makeFeePayment() as never);
  });

  it("enforces RBAC (write roles only)", async () => {
    await expectRbac(POST_PAYMENT, [...WRITE_ROLES], () =>
      buildRequest("/api/v1/fees/payments", { method: "POST", body: validBody }),
    );
  });

  it("400s on a validation error (missing payment mode)", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST_PAYMENT,
      buildRequest("/api/v1/fees/payments", { method: "POST", body: { ...validBody, paymentMode: undefined } }),
    );
    expect(res.status).toBe(400);
  });

  it("400s when amountPaid is over the max", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    const res = await callRoute(
      POST_PAYMENT,
      buildRequest("/api/v1/fees/payments", { method: "POST", body: { ...validBody, amountPaid: 10_000_001 } }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount is too large/i);
  });

  it("400s when the student does not belong to the caller's school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.student.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(POST_PAYMENT, buildRequest("/api/v1/fees/payments", { method: "POST", body: validBody }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/student/i);
    // confirms the lookup was tenancy-scoped
    expect(prismaMock.student.findFirst.mock.calls[0][0]!.where).toEqual({ id: "student-1", schoolId: "school-1" });
  });

  it("400s when the fee structure does not belong to the caller's school", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    prismaMock.feeStructure.findFirst.mockResolvedValue(null as never);
    const res = await callRoute(POST_PAYMENT, buildRequest("/api/v1/fees/payments", { method: "POST", body: validBody }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fee structure/i);
    expect(prismaMock.feeStructure.findFirst.mock.calls[0][0]!.where).toEqual({ id: "fee-structure-1", schoolId: "school-1" });
  });

  it("creates a payment, scoping to the caller's school and generating a receipt number from the school code", async () => {
    setSession(sessionFor("TEACHER", { schoolId: "school-1" }));
    const res = await callRoute(POST_PAYMENT, buildRequest("/api/v1/fees/payments", { method: "POST", body: validBody }));
    expect(res.status).toBe(201);

    expect(prismaMock.school.findUnique.mock.calls[0][0]!.where).toEqual({ id: "school-1" });

    const data = prismaMock.feePayment.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.schoolId).toBe("school-1");
    expect(data.studentId).toBe("student-1");
    expect(data.feeStructureId).toBe("fee-structure-1");
    expect(String(data.receiptNumber)).toMatch(/^RCPT-SCH001-\d{8}$/);
  });

  it("stores the periodLabel on the payment record", async () => {
    setSession(sessionFor("SCHOOL_ADMIN", { schoolId: "school-1" }));
    await callRoute(POST_PAYMENT, buildRequest("/api/v1/fees/payments", {
      method: "POST",
      body: { ...validBody, periodLabel: "Q2 Jul–Sep 2025" },
    }));
    const data = prismaMock.feePayment.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data.periodLabel).toBe("Q2 Jul–Sep 2025");
  });
});
