import { describe, it, expect } from "vitest";
import { computeExpectedTotal, buildPaidMap, remainingFor, installmentCount } from "@/lib/fees";

describe("installmentCount", () => {
  it("returns 12 for MONTHLY", () => expect(installmentCount("MONTHLY")).toBe(12));
  it("returns 4 for QUARTERLY", () => expect(installmentCount("QUARTERLY")).toBe(4));
  it("returns 2 for HALF_YEARLY", () => expect(installmentCount("HALF_YEARLY")).toBe(2));
  it("returns 1 for ONE_TIME", () => expect(installmentCount("ONE_TIME")).toBe(1));
  it("returns 1 for ANNUALLY", () => expect(installmentCount("ANNUALLY")).toBe(1));
});

describe("computeExpectedTotal", () => {
  it("applies a class-scoped structure only to students in that class", () => {
    const structures = [{ amount: 20000, classId: "class-1", frequency: "ONE_TIME" }];
    const students = [{ classId: "class-1" }, { classId: "class-1" }, { classId: "class-2" }];
    expect(computeExpectedTotal(structures, students)).toBe(40000);
  });

  it("applies a school-wide structure (classId null) to every student", () => {
    const structures = [{ amount: 500, classId: null, frequency: "ONE_TIME" }];
    const students = [{ classId: "class-1" }, { classId: "class-2" }];
    expect(computeExpectedTotal(structures, students)).toBe(1000);
  });

  it("multiplies monthly amount by 12", () => {
    const structures = [{ amount: 1000, classId: null, frequency: "MONTHLY" }];
    const students = [{ classId: "class-1" }];
    expect(computeExpectedTotal(structures, students)).toBe(12000);
  });

  it("multiplies quarterly amount by 4", () => {
    const structures = [{ amount: 3000, classId: null, frequency: "QUARTERLY" }];
    const students = [{ classId: "class-1" }, { classId: "class-2" }];
    expect(computeExpectedTotal(structures, students)).toBe(24000);
  });

  it("multiplies half-yearly amount by 2", () => {
    const structures = [{ amount: 6000, classId: null, frequency: "HALF_YEARLY" }];
    const students = [{ classId: "class-1" }];
    expect(computeExpectedTotal(structures, students)).toBe(12000);
  });

  it("sums across multiple structures including different frequencies", () => {
    const structures = [
      { amount: 20000, classId: "class-1", frequency: "ONE_TIME" },
      { amount: 500,   classId: null,      frequency: "MONTHLY" },
    ];
    const students = [{ classId: "class-1" }, { classId: "class-2" }];
    // class-1 students get both: 20000*1*1 + 500*12*1 = 26000; class-2 gets 500*12*1 = 6000
    expect(computeExpectedTotal(structures, students)).toBe(26000 + 6000);
  });

  it("defaults missing frequency to ONE_TIME", () => {
    const structures = [{ amount: 5000, classId: null }];
    const students = [{ classId: "class-1" }];
    expect(computeExpectedTotal(structures, students)).toBe(5000);
  });
});

describe("buildPaidMap + remainingFor", () => {
  it("counts PAID and PARTIAL payments but not PENDING or OVERDUE", () => {
    const map = buildPaidMap([
      { studentId: "s1", feeStructureId: "f1", amountPaid: 3000, status: "PAID" },
      { studentId: "s1", feeStructureId: "f1", amountPaid: 1000, status: "PARTIAL" },
      { studentId: "s1", feeStructureId: "f1", amountPaid: 500,  status: "PENDING" },
      { studentId: "s1", feeStructureId: "f1", amountPaid: 200,  status: "OVERDUE" },
    ]);
    // 3000 PAID + 1000 PARTIAL = 4000; PENDING and OVERDUE excluded
    expect(remainingFor(map, "s1", "f1", 20000)).toBe(16000);
  });

  it("never returns a negative remaining balance when overpaid", () => {
    const map = buildPaidMap([{ studentId: "s1", feeStructureId: "f1", amountPaid: 25000, status: "PAID" }]);
    expect(remainingFor(map, "s1", "f1", 20000)).toBe(0);
  });

  it("treats an unpaid pair as owing the full annual obligation", () => {
    const map = buildPaidMap([]);
    // MONTHLY ₹1000 → 12 installments → ₹12000 owed
    expect(remainingFor(map, "s1", "f1", 1000, "MONTHLY")).toBe(12000);
  });

  it("accounts for frequency when computing the total expected amount", () => {
    const map = buildPaidMap([
      { studentId: "s1", feeStructureId: "f1", amountPaid: 3000, status: "PAID" },
    ]);
    // QUARTERLY ₹3000 × 4 = ₹12000 total; paid ₹3000 → remaining ₹9000
    expect(remainingFor(map, "s1", "f1", 3000, "QUARTERLY")).toBe(9000);
  });

  it("excludes CANCELLED payments entirely", () => {
    const map = buildPaidMap([
      { studentId: "s1", feeStructureId: "f1", amountPaid: 5000, status: "CANCELLED" },
    ]);
    expect(remainingFor(map, "s1", "f1", 5000)).toBe(5000);
  });

  it("defaults missing frequency to ONE_TIME (no multiplier)", () => {
    const map = buildPaidMap([{ studentId: "s1", feeStructureId: "f2", amountPaid: 500, status: "PAID" }]);
    expect(remainingFor(map, "s1", "f2", 500)).toBe(0);
  });
});
