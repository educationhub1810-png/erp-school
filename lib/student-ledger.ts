// Expands fee structures + payments into a chronological, passbook-style
// student ledger: one row per fee that has actually come due, and one row
// per payment actually received — matching the day/month/year accrual a
// physical fee ledger register shows (dues accumulate as each due date
// passes; payments append as they're recorded).

export interface LedgerStructure {
  feeType: string;
  amount: number;
  frequency: string; // FrequencyType
  dueDate: Date | null;
  monthlyDueDay: number | null;
  installments: { period: string; dueDate?: string }[] | null;
  academicYearStart: Date | null;
}

export interface LedgerPayment {
  feeType: string;
  amountPaid: number;
  paymentDate: Date | null;
  paymentMode: string;
  status: string;
}

export interface DueEntry {
  date: Date;
  feeType: string;
  amount: number;
}

export interface PaymentEntry {
  date: Date;
  feeType: string;
  amount: number;
  paymentMode: string;
}

/** Indian academic year (Apr–Mar) start date containing `asOf`, used when a
 * MONTHLY structure has no linked AcademicYear to anchor its first due date. */
function defaultAcademicYearStart(asOf: Date): Date {
  const year = asOf.getMonth() >= 3 ? asOf.getFullYear() : asOf.getFullYear() - 1;
  return new Date(year, 3, 1);
}

/** All individual due-date line items that have come due on or before `asOf`. */
export function expandDueEntries(structures: LedgerStructure[], asOf: Date): DueEntry[] {
  const entries: DueEntry[] = [];

  for (const s of structures) {
    if (s.frequency === "MONTHLY") {
      const anchor = s.academicYearStart ?? defaultAcademicYearStart(asOf);
      const day = s.monthlyDueDay ?? 1;
      let cursor = new Date(anchor.getFullYear(), anchor.getMonth(), day);
      while (cursor.getTime() <= asOf.getTime()) {
        entries.push({ date: cursor, feeType: s.feeType, amount: s.amount });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, day);
      }
    } else if (s.frequency === "QUARTERLY" || s.frequency === "HALF_YEARLY") {
      for (const inst of s.installments ?? []) {
        if (!inst.dueDate) continue;
        const d = new Date(inst.dueDate);
        if (d.getTime() <= asOf.getTime()) entries.push({ date: d, feeType: s.feeType, amount: s.amount });
      }
    } else {
      // ONE_TIME / ANNUALLY — a single due line, immediately due if no date was set.
      const d = s.dueDate ?? asOf;
      if (d.getTime() <= asOf.getTime()) entries.push({ date: d, feeType: s.feeType, amount: s.amount });
    }
  }

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** All payments actually received (PAID/PARTIAL) on or before `asOf`. */
export function buildPaymentEntries(payments: LedgerPayment[], asOf: Date): PaymentEntry[] {
  return payments
    .filter((p) => (p.status === "PAID" || p.status === "PARTIAL") && p.paymentDate && p.paymentDate.getTime() <= asOf.getTime())
    .map((p) => ({ date: p.paymentDate as Date, feeType: p.feeType, amount: p.amountPaid, paymentMode: p.paymentMode }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface LedgerTotals {
  totalDue: number;
  totalPaid: number;
  balance: number;
}

export function ledgerTotals(due: DueEntry[], paid: PaymentEntry[]): LedgerTotals {
  const totalDue = due.reduce((s, d) => s + d.amount, 0);
  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  return { totalDue, totalPaid, balance: Math.max(0, totalDue - totalPaid) };
}

export interface PeriodSummary {
  period: string;
  due: number;
  paid: number;
  runningBalance: number;
}

/** Groups entries into periods (e.g. "Apr 2026" or "2026"), each period's own
 * due/paid totals plus a cumulative running balance across periods in order. */
function groupByPeriod(due: DueEntry[], paid: PaymentEntry[], keyOf: (d: Date) => string): PeriodSummary[] {
  const periods = new Map<string, { due: number; paid: number }>();
  const order: string[] = [];

  const touch = (key: string) => {
    if (!periods.has(key)) {
      periods.set(key, { due: 0, paid: 0 });
      order.push(key);
    }
    return periods.get(key)!;
  };

  for (const d of due) touch(keyOf(d.date)).due += d.amount;
  for (const p of paid) touch(keyOf(p.date)).paid += p.amount;

  order.sort();

  let cumulativeDue = 0;
  let cumulativePaid = 0;
  return order.map((key) => {
    const bucket = periods.get(key)!;
    cumulativeDue += bucket.due;
    cumulativePaid += bucket.paid;
    return { period: key, due: bucket.due, paid: bucket.paid, runningBalance: Math.max(0, cumulativeDue - cumulativePaid) };
  });
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function groupByMonth(due: DueEntry[], paid: PaymentEntry[]): PeriodSummary[] {
  return groupByPeriod(due, paid, (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`).map((row) => {
    const [year, month] = row.period.split("-");
    return { ...row, period: `${MONTH_LABELS[Number(month) - 1]} ${year}` };
  });
}

export function groupByYear(due: DueEntry[], paid: PaymentEntry[]): PeriodSummary[] {
  return groupByPeriod(due, paid, (d) => String(d.getFullYear()));
}
