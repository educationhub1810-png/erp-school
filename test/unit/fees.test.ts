import { describe, it, expect } from "vitest";
import { computeExpectedTotal, buildPaidMap, remainingFor } from "@/lib/fees";

describe("computeExpectedTotal", () => {
  it("applies a class-scoped structure only to students in that class", () => {
    const structures = [{ amount: 20000, classId: "class-1" }];
    const students = [{ classId: "class-1" }, { classId: "class-1" }, { classId: "class-2" }];
    expect(computeExpectedTotal(structures, students)).toBe(40000);
  });

  it("applies a school-wide structure (classId null) to every student", () => {
    const structures = [{ amount: 500, classId: null }];
    const students = [{ classId: "class-1" }, { classId: "class-2" }];
    expect(computeExpectedTotal(structures, students)).toBe(1000);
  });

  it("sums across multiple structures", () => {
    const structures = [
      { amount: 20000, classId: "class-1" },
      { amount: 500, classId: null },
    ];
    const students = [{ classId: "class-1" }, { classId: "class-2" }];
    expect(computeExpectedTotal(structures, students)).toBe(20000 + 1000);
  });
});

describe("buildPaidMap + remainingFor", () => {
  it("sums only PAID payments per student+structure pair", () => {
    const map = buildPaidMap([
      { studentId: "s1", feeStructureId: "f1", amountPaid: 3000, status: "PAID" },
      { studentId: "s1", feeStructureId: "f1", amountPaid: 1000, status: "PENDING" },
      { studentId: "s1", feeStructureId: "f2", amountPaid: 500, status: "PAID" },
    ]);
    expect(remainingFor(map, "s1", "f1", 20000)).toBe(17000);
    expect(remainingFor(map, "s1", "f2", 500)).toBe(0);
  });

  it("never returns a negative remaining balance when overpaid", () => {
    const map = buildPaidMap([{ studentId: "s1", feeStructureId: "f1", amountPaid: 25000, status: "PAID" }]);
    expect(remainingFor(map, "s1", "f1", 20000)).toBe(0);
  });

  it("treats an unpaid pair as owing the full structure amount", () => {
    const map = buildPaidMap([]);
    expect(remainingFor(map, "s1", "f1", 20000)).toBe(20000);
  });
});
