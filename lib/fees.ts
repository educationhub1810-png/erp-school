// Shared fee-balance math used by the school-admin, teacher, and student fee
// pages so "expected total" and "remaining" are computed identically everywhere.

export type FeeFrequency = "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUALLY";

/** Number of installments per academic year for a given frequency. */
export function installmentCount(frequency: string): number {
  switch (frequency) {
    case "MONTHLY":     return 12;
    case "QUARTERLY":   return 4;
    case "HALF_YEARLY": return 2;
    default:            return 1; // ONE_TIME, ANNUALLY
  }
}

/** Human-readable label for a frequency type. */
export function frequencyLabel(frequency: string): string {
  switch (frequency) {
    case "MONTHLY":     return "Monthly";
    case "QUARTERLY":   return "Quarterly";
    case "HALF_YEARLY": return "Half-yearly";
    case "ANNUALLY":    return "Annually";
    default:            return "One-time";
  }
}

/** Pre-defined period labels for the Record Payment period dropdown. */
export function periodOptions(frequency: string, academicStartYear?: number): string[] {
  const year = academicStartYear ?? new Date().getFullYear();
  const y1 = year;
  const y2 = year + 1;
  switch (frequency) {
    case "MONTHLY":
      return [
        `Apr ${y1}`, `May ${y1}`, `Jun ${y1}`,
        `Jul ${y1}`, `Aug ${y1}`, `Sep ${y1}`,
        `Oct ${y1}`, `Nov ${y1}`, `Dec ${y1}`,
        `Jan ${y2}`, `Feb ${y2}`, `Mar ${y2}`,
      ];
    case "QUARTERLY":
      return [
        `Q1 Apr–Jun ${y1}`,
        `Q2 Jul–Sep ${y1}`,
        `Q3 Oct–Dec ${y1}`,
        `Q4 Jan–Mar ${y2}`,
      ];
    case "HALF_YEARLY":
      return [`Apr–Sep ${y1}`, `Oct–Mar ${y1}–${y2.toString().slice(2)}`];
    default:
      return [`${y1}–${y2.toString().slice(2)}`];
  }
}

// ──────────────────────────────────────────────
// EXPECTED TOTAL
// ──────────────────────────────────────────────

interface StructureLike {
  amount: number;
  classId: string | null;
  frequency?: string;
}

interface StudentLike {
  classId: string;
}

/**
 * Full annual obligation for all structures × all applicable students.
 * Multiplies per-installment amount by the number of installments per year
 * so monthly/quarterly/half-yearly fees are counted correctly.
 */
export function computeExpectedTotal(structures: StructureLike[], students: StudentLike[]): number {
  return structures.reduce((sum, s) => {
    const applicable = s.classId
      ? students.filter((st) => st.classId === s.classId).length
      : students.length;
    return sum + s.amount * installmentCount(s.frequency ?? "ONE_TIME") * applicable;
  }, 0);
}

// ──────────────────────────────────────────────
// PAID MAP & REMAINING
// ──────────────────────────────────────────────

interface PaymentLike {
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  status: string;
}

function paidKey(studentId: string, feeStructureId: string): string {
  return `${studentId}:${feeStructureId}`;
}

/**
 * Sums actual money received (PAID + PARTIAL) per (student, feeStructure) pair.
 * PENDING and OVERDUE are NOT counted — those represent amounts still owed.
 * CANCELLED payments are excluded entirely.
 */
export function buildPaidMap(payments: PaymentLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "PAID" && p.status !== "PARTIAL") continue;
    const key = paidKey(p.studentId, p.feeStructureId);
    map.set(key, (map.get(key) ?? 0) + p.amountPaid);
  }
  return map;
}

/**
 * Outstanding balance for one student on one fee structure, never negative.
 * Uses the full annual obligation (per-installment amount × installment count)
 * so that partial payers correctly see the balance across all periods.
 */
export function remainingFor(
  paidMap: Map<string, number>,
  studentId: string,
  feeStructureId: string,
  structureAmount: number,
  frequency: string = "ONE_TIME",
): number {
  const paid = paidMap.get(paidKey(studentId, feeStructureId)) ?? 0;
  const totalExpected = structureAmount * installmentCount(frequency);
  return Math.max(0, totalExpected - paid);
}
