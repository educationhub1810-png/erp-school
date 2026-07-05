import { describe, it, expect } from "vitest";
import {
  expandDueEntries,
  buildPaymentEntries,
  ledgerTotals,
  groupByMonth,
  groupByYear,
  type LedgerStructure,
  type LedgerPayment,
} from "@/lib/student-ledger";

function oneTime(feeType: string, amount: number, dueDate: string | null): LedgerStructure {
  return { feeType, amount, frequency: "ONE_TIME", dueDate: dueDate ? new Date(dueDate) : null, monthlyDueDay: null, installments: null, academicYearStart: null };
}

function monthly(feeType: string, amount: number, academicYearStart: string): LedgerStructure {
  return { feeType, amount, frequency: "MONTHLY", dueDate: null, monthlyDueDay: 1, installments: null, academicYearStart: new Date(academicYearStart) };
}

describe("expandDueEntries", () => {
  it("includes a ONE_TIME due line once it has passed", () => {
    const entries = expandDueEntries([oneTime("Admission Fees", 5000, "2026-04-01")], new Date("2026-04-25"));
    expect(entries).toEqual([{ date: new Date("2026-04-01"), feeType: "Admission Fees", amount: 5000 }]);
  });

  it("treats a ONE_TIME structure with no dueDate as immediately due", () => {
    const asOf = new Date("2026-04-25");
    const entries = expandDueEntries([oneTime("Misc Fees", 300, null)], asOf);
    expect(entries).toEqual([{ date: asOf, feeType: "Misc Fees", amount: 300 }]);
  });

  it("only accrues one MONTHLY row per elapsed month, growing as time passes", () => {
    const structures = [monthly("Tuition Fees", 2000, "2026-04-01")];

    const asOfApr = expandDueEntries(structures, new Date("2026-04-25"));
    expect(asOfApr).toEqual([{ date: new Date(2026, 3, 1), feeType: "Tuition Fees", amount: 2000 }]);

    const asOfMay = expandDueEntries(structures, new Date("2026-05-02"));
    expect(asOfMay).toEqual([
      { date: new Date(2026, 3, 1), feeType: "Tuition Fees", amount: 2000 },
      { date: new Date(2026, 4, 1), feeType: "Tuition Fees", amount: 2000 },
    ]);

    const asOfJun = expandDueEntries(structures, new Date("2026-06-15"));
    expect(asOfJun).toEqual([
      { date: new Date(2026, 3, 1), feeType: "Tuition Fees", amount: 2000 },
      { date: new Date(2026, 4, 1), feeType: "Tuition Fees", amount: 2000 },
      { date: new Date(2026, 5, 1), feeType: "Tuition Fees", amount: 2000 },
    ]);
  });

  it("only includes QUARTERLY installments whose due date has passed", () => {
    const structure: LedgerStructure = {
      feeType: "Term Fees", amount: 3000, frequency: "QUARTERLY", dueDate: null, monthlyDueDay: null,
      installments: [
        { period: "Q1", dueDate: "2026-04-01" },
        { period: "Q2", dueDate: "2026-07-01" },
      ],
      academicYearStart: null,
    };
    const entries = expandDueEntries([structure], new Date("2026-05-01"));
    expect(entries).toEqual([{ date: new Date("2026-04-01"), feeType: "Term Fees", amount: 3000 }]);
  });

  it("sorts entries chronologically across structures", () => {
    const entries = expandDueEntries(
      [oneTime("B Fee", 100, "2026-04-02"), oneTime("A Fee", 200, "2026-04-01")],
      new Date("2026-04-25"),
    );
    expect(entries.map((e) => e.feeType)).toEqual(["A Fee", "B Fee"]);
  });
});

describe("buildPaymentEntries", () => {
  const base: LedgerPayment = { feeType: "Tuition Fees", amountPaid: 2000, paymentDate: new Date("2026-04-05"), paymentMode: "CASH", status: "PAID" };

  it("includes PAID and PARTIAL payments up to asOf", () => {
    const entries = buildPaymentEntries([base, { ...base, status: "PARTIAL", amountPaid: 500 }], new Date("2026-04-25"));
    expect(entries).toHaveLength(2);
  });

  it("excludes PENDING, OVERDUE, and CANCELLED payments", () => {
    expect(buildPaymentEntries([{ ...base, status: "PENDING" }], new Date("2026-04-25"))).toEqual([]);
    expect(buildPaymentEntries([{ ...base, status: "OVERDUE" }], new Date("2026-04-25"))).toEqual([]);
    expect(buildPaymentEntries([{ ...base, status: "CANCELLED" }], new Date("2026-04-25"))).toEqual([]);
  });

  it("excludes payments dated after asOf", () => {
    expect(buildPaymentEntries([{ ...base, paymentDate: new Date("2026-05-01") }], new Date("2026-04-25"))).toEqual([]);
  });
});

describe("ledgerTotals", () => {
  it("computes the outstanding balance as due minus paid", () => {
    const due = [{ date: new Date(), feeType: "A", amount: 9500 }];
    const paid = [{ date: new Date(), feeType: "A", amount: 5500, paymentMode: "CASH" }];
    expect(ledgerTotals(due, paid)).toEqual({ totalDue: 9500, totalPaid: 5500, balance: 4000 });
  });

  it("never returns a negative balance when overpaid", () => {
    const due = [{ date: new Date(), feeType: "A", amount: 1000 }];
    const paid = [{ date: new Date(), feeType: "A", amount: 1500, paymentMode: "CASH" }];
    expect(ledgerTotals(due, paid).balance).toBe(0);
  });
});

describe("groupByMonth / groupByYear", () => {
  const due = [
    { date: new Date("2026-04-01"), feeType: "Tuition", amount: 2000 },
    { date: new Date("2026-05-01"), feeType: "Tuition", amount: 2000 },
  ];
  const paid = [{ date: new Date("2026-04-05"), feeType: "Tuition", amount: 2000, paymentMode: "CASH" }];

  it("groups by calendar month with a cumulative running balance", () => {
    expect(groupByMonth(due, paid)).toEqual([
      { period: "Apr 2026", due: 2000, paid: 2000, runningBalance: 0 },
      { period: "May 2026", due: 2000, paid: 0, runningBalance: 2000 },
    ]);
  });

  it("groups by calendar year with a cumulative running balance", () => {
    expect(groupByYear(due, paid)).toEqual([
      { period: "2026", due: 4000, paid: 2000, runningBalance: 2000 },
    ]);
  });
});
