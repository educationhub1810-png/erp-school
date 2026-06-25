// Shared fee-balance math used by the school-admin, teacher, and student fee
// pages, so "expected total" and "remaining" are computed the same way
// everywhere a fee structure's outstanding balance is shown.

interface StructureLike {
  amount: number;
  classId: string | null;
}

interface StudentLike {
  classId: string;
}

// A fee structure applies to every student if classId is null, or only to
// students in that class otherwise. Expected total = what every applicable
// student owes, summed across all structures.
export function computeExpectedTotal(structures: StructureLike[], students: StudentLike[]): number {
  return structures.reduce((sum, s) => {
    const applicableCount = s.classId ? students.filter((st) => st.classId === s.classId).length : students.length;
    return sum + s.amount * applicableCount;
  }, 0);
}

interface PaymentLike {
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  status: string;
}

function paidKey(studentId: string, feeStructureId: string): string {
  return `${studentId}:${feeStructureId}`;
}

// Sum of PAID payments per (student, fee structure) pair.
export function buildPaidMap(payments: PaymentLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "PAID") continue;
    const key = paidKey(p.studentId, p.feeStructureId);
    map.set(key, (map.get(key) ?? 0) + p.amountPaid);
  }
  return map;
}

// Outstanding balance for one student on one fee structure, never negative.
export function remainingFor(paidMap: Map<string, number>, studentId: string, feeStructureId: string, structureAmount: number): number {
  const paid = paidMap.get(paidKey(studentId, feeStructureId)) ?? 0;
  return Math.max(0, structureAmount - paid);
}
