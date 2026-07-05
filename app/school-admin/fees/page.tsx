import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { Pagination } from "@/components/shared/pagination";
import { CreateFeeStructureDialog } from "@/components/shared/create-fee-structure-dialog";
import { RecordFeePaymentDialog } from "@/components/shared/record-fee-payment-dialog";
import { FeeStructureRowActions, FeePaymentRowActions } from "@/components/shared/fee-row-actions";
import { sortClassesByGrade } from "@/lib/class-order";
import { computeExpectedTotal, buildPaidMap, remainingFor, frequencyLabel, installmentCount } from "@/lib/fees";
import { DownloadReceiptButton } from "@/components/shared/download-receipt-button";
import { IndianRupee, Users, CalendarClock, BookOpen } from "lucide-react";
import { StudentLedgerTable } from "@/components/fees/student-ledger-table";
import Link from "next/link";

type Tab = "overview" | "ledger" | "due-dates" | "class-pending";

interface Props {
  searchParams: Promise<{ tab?: string; page?: string; classId?: string; search?: string }>;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",      label: "Overview" },
  { key: "ledger",        label: "Student Ledger" },
  { key: "due-dates",     label: "Due Date Summary" },
  { key: "class-pending", label: "Class-wise Pending" },
];

const statusStyle: Record<string, string> = {
  PAID:    "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  PARTIAL: "bg-orange-100 text-orange-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default async function FeesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const sp = await searchParams;
  const tab = (sp.tab ?? "overview") as Tab;
  const page = parseInt(sp.page ?? "1");
  const filterClassId = sp.classId ?? "";
  const search = sp.search ?? "";
  const limit = 20;
  const skip = (page - 1) * limit;

  // ── Core data (needed by all tabs) ───────────────────────────────────────
  const [structures, classesRaw, allStudents, allPaymentsRaw, school] = await Promise.all([
    prisma.feeStructure.findMany({
      where: { schoolId },
      include: { class: { select: { name: true } }, academicYear: { select: { startDate: true } } },
      orderBy: { feeType: "asc" },
    }),
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    prisma.student.findMany({
      where: { schoolId, isAlumni: false },
      select: {
        id: true, classId: true, firstName: true, lastName: true,
        class: { select: { id: true, name: true } },
        section: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { firstName: "asc" }],
    }),
    prisma.feePayment.findMany({
      where: { schoolId },
      select: { id: true, studentId: true, feeStructureId: true, amountPaid: true, status: true, paymentDate: true, paymentMode: true },
    }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, code: true } }),
  ]);

  const classes = sortClassesByGrade(classesRaw);
  const paidMap = buildPaidMap(allPaymentsRaw);
  const structureById = new Map(structures.map((s) => [s.id, s]));

  const totalCollected = allPaymentsRaw
    .filter((p) => p.status === "PAID" || p.status === "PARTIAL")
    .reduce((s, p) => s + Number(p.amountPaid), 0);
  const expectedTotal = computeExpectedTotal(
    structures.map((s) => ({ amount: Number(s.amount), classId: s.classId, frequency: s.frequency })),
    allStudents,
  );
  const totalPending = Math.max(0, expectedTotal - totalCollected);

  // ── Overview tab extra data ───────────────────────────────────────────────
  let payments: Awaited<ReturnType<typeof prisma.feePayment.findMany>> = [];
  let paymentsTotal = 0;
  let fullPaymentById = new Map<string, { id: string; periodLabel: string | null; transactionId: string | null; remarks: string | null; paymentMode: string; status: string; paymentDate: Date | null; amountPaid: number; feeStructureId: string }>();

  if (tab === "overview") {
    const [paymentsData, totalCount, fullPaymentsData] = await Promise.all([
      prisma.feePayment.findMany({
        where: { schoolId },
        include: {
          student: { include: { user: { select: { name: true } } } },
          feeStructure: { select: { feeType: true, frequency: true } },
        },
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.feePayment.count({ where: { schoolId } }),
      prisma.feePayment.findMany({
        where: { schoolId },
        select: {
          id: true, periodLabel: true, transactionId: true, remarks: true,
          paymentMode: true, status: true, paymentDate: true, amountPaid: true, feeStructureId: true,
        },
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
    ]);
    payments = paymentsData;
    paymentsTotal = totalCount;
    fullPaymentById = new Map(fullPaymentsData.map((p) => [p.id, { ...p, amountPaid: Number(p.amountPaid) }]));
  }

  const totalPages = Math.ceil(paymentsTotal / limit);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function studentName(s: (typeof allStudents)[0]) {
    return s.user?.name ?? `${s.firstName} ${s.lastName}`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-sm text-gray-500 mt-1">{structures.length} fee structures · {allPaymentsRaw.length} transactions</p>
        </div>
        <div className="flex gap-2">
          <CreateFeeStructureDialog classes={classes} />
          <RecordFeePaymentDialog
            students={allStudents}
            feeStructures={structures.map((s) => ({
              id: s.id, feeType: s.feeType, amount: Number(s.amount), frequency: s.frequency,
              installments: s.installments as { period: string; dueDate?: string }[] | null,
              monthlyDueDay: s.monthlyDueDay,
            }))}
            existingPayments={allPaymentsRaw}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Collected" value={`₹${totalCollected.toLocaleString("en-IN")}`} subtitle="Paid + Partial" icon={<IndianRupee className="w-4 h-4" />} color="green" />
        <StatCard title="Annual Pending"  value={`₹${totalPending.toLocaleString("en-IN")}`}  subtitle="Full-year outstanding" icon={<IndianRupee className="w-4 h-4" />} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? "bg-white border border-b-white text-indigo-600 border-gray-200 -mb-px"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Fee Structures */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Fee Structures</CardTitle></CardHeader>
            <CardContent className="p-0">
              {structures.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No fee structures defined yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Fee Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Frequency</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Amount / Installment</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Annual Total</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Applies To</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {structures.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.feeType}</td>
                        <td className="px-4 py-3 text-gray-600">{frequencyLabel(s.frequency)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">₹{Number(s.amount).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          ₹{(Number(s.amount) * installmentCount(s.frequency)).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{s.class?.name ?? "All classes"}</td>
                        <td className="px-4 py-3 text-right">
                          <FeeStructureRowActions
                            structure={{
                              id: s.id, feeType: s.feeType, amount: Number(s.amount),
                              frequency: s.frequency, dueDate: s.dueDate?.toISOString() ?? null,
                              monthlyDueDay: s.monthlyDueDay,
                              installments: s.installments as { period: string; dueDate?: string }[] | null,
                              description: s.description,
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
            <CardContent className="p-0">
              {paymentsTotal === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">No payments found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Fee Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Period</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Balance</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((p) => {
                      const structure = structureById.get(p.feeStructureId);
                      const remaining = remainingFor(paidMap, p.studentId, p.feeStructureId, Number(structure?.amount ?? 0), structure?.frequency ?? "ONE_TIME");
                      const full = fullPaymentById.get(p.id);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{(p as { student?: { user?: { name?: string | null } | null } | null }).student?.user?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-500">{(p as { feeStructure?: { feeType?: string } | null }).feeStructure?.feeType ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{full?.periodLabel ?? "—"}</td>
                          <td className="px-4 py-3 text-right text-gray-700">₹{Number(p.amountPaid).toLocaleString("en-IN")}</td>
                          <td className={`px-4 py-3 text-right ${remaining > 0 ? "text-red-600 font-medium" : "text-gray-400"}`}>
                            ₹{remaining.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={statusStyle[p.status] ?? "bg-gray-100 text-gray-500"}>{p.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <DownloadReceiptButton
                                receipt={{
                                  receiptNumber: p.receiptNumber,
                                  studentName: (p as { student?: { user?: { name?: string | null } | null } | null }).student?.user?.name ?? "—",
                                  feeType: (p as { feeStructure?: { feeType?: string } | null }).feeStructure?.feeType ?? "—",
                                  periodLabel: full?.periodLabel,
                                  amountPaid: Number(p.amountPaid),
                                  remaining,
                                  paymentDate: p.paymentDate ? p.paymentDate.toISOString() : null,
                                  paymentMode: p.paymentMode,
                                  status: p.status,
                                  schoolName: school?.name ?? "School",
                                  schoolCode: school?.code ?? "",
                                }}
                              />
                              {full && (
                                <FeePaymentRowActions
                                  payment={{
                                    id: p.id,
                                    amountPaid: Number(p.amountPaid),
                                    paymentDate: p.paymentDate ? p.paymentDate.toISOString() : null,
                                    paymentMode: full.paymentMode,
                                    transactionId: full.transactionId,
                                    status: full.status,
                                    periodLabel: full.periodLabel,
                                    remarks: full.remarks,
                                    feeStructureFrequency: structure?.frequency,
                                    feeStructureInstallments: structure?.installments as { period: string }[] | null,
                                  }}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Pagination page={page} totalPages={totalPages} total={paymentsTotal} limit={limit} skip={skip} />
        </div>
      )}

      {/* ── STUDENT LEDGER TAB ── */}
      {tab === "ledger" && (() => {
        const ledgerRows = allStudents.map((student) => {
          const applicable = structures.filter((s) => !s.classId || s.classId === student.classId);
          const lines = applicable.map((s) => {
            const obligation = Number(s.amount) * installmentCount(s.frequency);
            const paid = paidMap.get(`${student.id}:${s.id}`) ?? 0;
            const balance = Math.max(0, obligation - paid);
            return {
              feeStructureId: s.id,
              feeType: s.feeType,
              frequency: s.frequency,
              obligation,
              paid,
              balance,
              installments: s.installments as { period: string }[] | null,
              monthlyDueDay: s.monthlyDueDay,
            };
          });
          const ledgerStructures = applicable.map((s) => ({
            feeType: s.feeType,
            amount: Number(s.amount),
            frequency: s.frequency,
            dueDate: s.dueDate,
            monthlyDueDay: s.monthlyDueDay,
            installments: s.installments as { period: string; dueDate?: string }[] | null,
            academicYearStart: s.academicYear?.startDate ?? null,
          }));
          const applicableIds = new Set(applicable.map((s) => s.id));
          const ledgerPayments = allPaymentsRaw
            .filter((p) => p.studentId === student.id && applicableIds.has(p.feeStructureId))
            .map((p) => ({
              feeType: structureById.get(p.feeStructureId)?.feeType ?? "—",
              amountPaid: Number(p.amountPaid),
              paymentDate: p.paymentDate,
              paymentMode: p.paymentMode,
              status: p.status,
            }));
          return {
            studentId: student.id,
            studentName: studentName(student),
            className: student.class.name,
            sectionName: student.section?.name ?? null,
            totalObligation: lines.reduce((sum, l) => sum + l.obligation, 0),
            totalPaid: lines.reduce((sum, l) => sum + l.paid, 0),
            totalBalance: lines.reduce((sum, l) => sum + l.balance, 0),
            lines,
            ledgerStructures,
            ledgerPayments,
          };
        });

        return (
          <StudentLedgerTable
            rows={ledgerRows}
            classes={classes}
            filterClassId={filterClassId}
            search={search}
            schoolName={school?.name ?? ""}
            schoolCode={school?.code ?? ""}
          />
        );
      })()}

      {/* ── DUE DATE SUMMARY TAB ── */}
      {tab === "due-dates" && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build a list of due items from all structures
        interface DueItem {
          structureId: string;
          feeType: string;
          frequency: string;
          className: string;
          dueLabel: string;
          dueDate: Date | null;
          totalStudents: number;
          totalExpected: number;
          totalCollected: number;
          totalPending: number;
          isOverdue: boolean;
        }

        const dueItems: DueItem[] = [];

        for (const s of structures) {
          const applicableStudents = s.classId
            ? allStudents.filter((st) => st.classId === s.classId)
            : allStudents;
          const count = applicableStudents.length;
          const amountPerInstallment = Number(s.amount);

          const collected = applicableStudents.reduce((sum, st) => {
            return sum + (paidMap.get(`${st.id}:${s.id}`) ?? 0);
          }, 0);

          if (s.frequency === "MONTHLY") {
            const dayLabel = s.monthlyDueDay ? `${s.monthlyDueDay}th of each month` : "recurring";
            const annualExpected = amountPerInstallment * 12 * count;
            dueItems.push({
              structureId: s.id, feeType: s.feeType, frequency: s.frequency,
              className: s.class?.name ?? "All classes",
              dueLabel: `Monthly — due on ${dayLabel}`,
              dueDate: null,
              totalStudents: count,
              totalExpected: annualExpected,
              totalCollected: collected,
              totalPending: Math.max(0, annualExpected - collected),
              isOverdue: false,
            });
            continue;
          }

          if (s.frequency === "QUARTERLY" || s.frequency === "HALF_YEARLY") {
            const installments = s.installments as { period: string; dueDate?: string }[] | null;
            if (installments?.length) {
              for (const inst of installments) {
                const dd = inst.dueDate ? new Date(inst.dueDate) : null;
                const isOverdue = dd ? dd < today : false;
                dueItems.push({
                  structureId: s.id, feeType: s.feeType, frequency: s.frequency,
                  className: s.class?.name ?? "All classes",
                  dueLabel: inst.period,
                  dueDate: dd,
                  totalStudents: count,
                  totalExpected: amountPerInstallment * count,
                  totalCollected: collected,
                  totalPending: Math.max(0, amountPerInstallment * count - collected),
                  isOverdue,
                });
              }
              continue;
            }
          }

          // ONE_TIME / ANNUALLY
          const dd = s.dueDate ? new Date(s.dueDate) : null;
          const isOverdue = dd ? dd < today : false;
          const totalExpected = amountPerInstallment * installmentCount(s.frequency) * count;
          dueItems.push({
            structureId: s.id, feeType: s.feeType, frequency: s.frequency,
            className: s.class?.name ?? "All classes",
            dueLabel: frequencyLabel(s.frequency),
            dueDate: dd,
            totalStudents: count,
            totalExpected,
            totalCollected: collected,
            totalPending: Math.max(0, totalExpected - collected),
            isOverdue,
          });
        }

        // Sort: overdue first, then by due date ascending, then no-date last
        dueItems.sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;
          return 0;
        });

        const overdueItems = dueItems.filter((d) => d.isOverdue);
        const upcomingItems = dueItems.filter((d) => !d.isOverdue && d.dueDate);
        const recurringItems = dueItems.filter((d) => !d.dueDate);

        const SummaryTable = ({ items }: { items: DueItem[] }) => (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Fee Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Class</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Period / Due Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Students</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Expected</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Collected</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((d, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${d.isOverdue ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{d.feeType}</td>
                  <td className="px-4 py-3 text-gray-500">{d.className}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{d.dueLabel}</div>
                    {d.dueDate && (
                      <div className={`text-xs ${d.isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
                        {d.isOverdue ? "Overdue · " : "Due: "}
                        {d.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{d.totalStudents}</td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{d.totalExpected.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-green-600">₹{d.totalCollected.toLocaleString("en-IN")}</td>
                  <td className={`px-4 py-3 text-right font-medium ${d.totalPending > 0 ? (d.isOverdue ? "text-red-600" : "text-orange-600") : "text-gray-400"}`}>
                    ₹{d.totalPending.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

        return (
          <div className="space-y-4">
            {overdueItems.length > 0 && (
              <Card className="border-0 shadow-sm border-l-4 border-l-red-400">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-red-500" />
                    Overdue ({overdueItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0"><SummaryTable items={overdueItems} /></CardContent>
              </Card>
            )}

            {upcomingItems.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-indigo-500" />
                    Upcoming Due Dates ({upcomingItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0"><SummaryTable items={upcomingItems} /></CardContent>
              </Card>
            )}

            {recurringItems.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-gray-400" />
                    Recurring / No Specific Date ({recurringItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0"><SummaryTable items={recurringItems} /></CardContent>
              </Card>
            )}

            {dueItems.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">No fee structures defined yet.</p>
            )}
          </div>
        );
      })()}

      {/* ── CLASS-WISE PENDING TAB ── */}
      {tab === "class-pending" && (() => {
        // Group students by class
        const classBuckets = new Map<string, { className: string; students: typeof allStudents }>();
        for (const cls of classes) {
          classBuckets.set(cls.id, { className: cls.name, students: [] });
        }
        for (const student of allStudents) {
          const bucket = classBuckets.get(student.classId);
          if (bucket) bucket.students.push(student);
        }

        const classRows = Array.from(classBuckets.values())
          .filter((b) => b.students.length > 0)
          .map((bucket) => {
            const applicable = structures.filter((s) => !s.classId || s.classId === bucket.students[0]?.classId);
            const classObligations = bucket.students.map((student) => {
              const lines = applicable.map((s) => {
                const obligation = Number(s.amount) * installmentCount(s.frequency);
                const paid = paidMap.get(`${student.id}:${s.id}`) ?? 0;
                const balance = Math.max(0, obligation - paid);
                return { obligation, paid, balance };
              });
              const totalObligation = lines.reduce((sum, l) => sum + l.obligation, 0);
              const totalPaid = lines.reduce((sum, l) => sum + l.paid, 0);
              const totalBalance = lines.reduce((sum, l) => sum + l.balance, 0);
              return { student, totalObligation, totalPaid, totalBalance };
            }).filter((r) => r.totalBalance > 0);

            const classTotalObligation = classObligations.reduce((sum, r) => sum + r.totalObligation, 0);
            const classTotalPaid = classObligations.reduce((sum, r) => sum + r.totalPaid, 0);
            const classTotalPending = classObligations.reduce((sum, r) => sum + r.totalBalance, 0);

            return { className: bucket.className, students: classObligations, classTotalObligation, classTotalPaid, classTotalPending };
          })
          .filter((c) => c.students.length > 0)
          .sort((a, b) => b.classTotalPending - a.classTotalPending);

        const grandTotal = classRows.reduce((sum, c) => sum + c.classTotalPending, 0);

        return (
          <div className="space-y-4">
            {/* Summary banner */}
            {classRows.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm">
                <Users className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-red-700 font-medium">
                  {classRows.reduce((sum, c) => sum + c.students.length, 0)} students across {classRows.length} classes have a pending balance of{" "}
                  <span className="font-bold">₹{grandTotal.toLocaleString("en-IN")}</span>
                </span>
              </div>
            )}

            {classRows.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">No pending fees found.</p>
            )}

            {classRows.map((cls) => (
              <Card key={cls.className} className="border-0 shadow-sm">
                <CardContent className="p-0">
                  {/* Class header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-indigo-50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      <span className="font-semibold text-gray-900 text-sm">{cls.className}</span>
                      <span className="text-xs text-gray-500">· {cls.students.length} pending</span>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-xs text-gray-400">Expected</p>
                        <p className="text-sm font-semibold text-gray-700">₹{cls.classTotalObligation.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Collected</p>
                        <p className="text-sm font-semibold text-green-600">₹{cls.classTotalPaid.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Pending</p>
                        <p className="text-sm font-bold text-red-600">₹{cls.classTotalPending.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Student rows */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">#</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Student</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Annual Due</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Paid</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Pending</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cls.students.map((row, idx) => {
                        const pct = row.totalObligation > 0 ? Math.round((row.totalPaid / row.totalObligation) * 100) : 0;
                        return (
                          <tr key={row.student.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-2 font-medium text-gray-900">{studentName(row.student)}</td>
                            <td className="px-4 py-2 text-right text-gray-700">₹{row.totalObligation.toLocaleString("en-IN")}</td>
                            <td className="px-4 py-2 text-right text-green-600">₹{row.totalPaid.toLocaleString("en-IN")}</td>
                            <td className="px-4 py-2 text-right font-semibold text-red-600">₹{row.totalBalance.toLocaleString("en-IN")}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-400">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
