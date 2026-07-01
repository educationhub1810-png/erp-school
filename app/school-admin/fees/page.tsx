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
import { IndianRupee } from "lucide-react";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function FeesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const [allPayments, payments, total, structures, classesRaw, students, school] = await Promise.all([
    prisma.feePayment.findMany({
      where: { schoolId },
      select: { studentId: true, feeStructureId: true, amountPaid: true, status: true },
    }),
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
    prisma.feeStructure.findMany({
      where: { schoolId },
      include: { class: { select: { name: true } } },
      orderBy: { feeType: "asc" },
    }),
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    prisma.student.findMany({
      where: { schoolId, isAlumni: false },
      select: { id: true, classId: true, firstName: true, lastName: true, class: { select: { name: true } }, section: { select: { name: true } } },
      orderBy: { firstName: "asc" },
    }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, code: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const classes = sortClassesByGrade(classesRaw);

  const structureById = new Map(
    structures.map((s) => [s.id, { amount: Number(s.amount), frequency: s.frequency }]),
  );
  const paidMap = buildPaidMap(allPayments);

  const totalCollected = allPayments
    .filter((p) => p.status === "PAID" || p.status === "PARTIAL")
    .reduce((s, p) => s + Number(p.amountPaid), 0);

  const expectedTotal = computeExpectedTotal(
    structures.map((s) => ({ amount: Number(s.amount), classId: s.classId, frequency: s.frequency })),
    students,
  );
  const totalPending = Math.max(0, expectedTotal - totalCollected);

  const statusStyle: Record<string, string> = {
    PAID:    "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    PARTIAL: "bg-orange-100 text-orange-700",
    OVERDUE: "bg-red-100 text-red-700",
  };

  // Fetch full payment fields for the visible page
  const fullPayments = await prisma.feePayment.findMany({
    where: { schoolId },
    select: {
      id: true, periodLabel: true, transactionId: true, remarks: true,
      paymentMode: true, status: true, paymentDate: true, amountPaid: true,
      feeStructureId: true,
    },
    orderBy: { paymentDate: "desc" },
    skip,
    take: limit,
  });
  const fullPaymentById = new Map(fullPayments.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-sm text-gray-500 mt-1">{structures.length} fee structures · {total} transactions</p>
        </div>
        <div className="flex gap-2">
          <CreateFeeStructureDialog classes={classes} />
          <RecordFeePaymentDialog
            students={students}
            feeStructures={structures.map((s) => ({
              id: s.id,
              feeType: s.feeType,
              amount: Number(s.amount),
              frequency: s.frequency,
              installments: s.installments as { period: string; dueDate?: string }[] | null,
              monthlyDueDay: s.monthlyDueDay,
            }))}
            existingPayments={allPayments}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Collected" value={`₹${totalCollected.toLocaleString("en-IN")}`} subtitle="Paid + Partial" icon={<IndianRupee className="w-5 h-5" />} color="green" />
        <StatCard title="Annual Pending"  value={`₹${totalPending.toLocaleString("en-IN")}`}  subtitle="Full-year outstanding" icon={<IndianRupee className="w-5 h-5" />} color="red" />
      </div>

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
                          id:            s.id,
                          feeType:       s.feeType,
                          amount:        Number(s.amount),
                          frequency:     s.frequency,
                          dueDate:       s.dueDate?.toISOString() ?? null,
                          monthlyDueDay: s.monthlyDueDay,
                          installments:  s.installments as { period: string; dueDate?: string }[] | null,
                          description:   s.description,
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
          {total === 0 ? (
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
                  const { amount: structureAmount, frequency: structureFrequency } =
                    structureById.get(p.feeStructureId) ?? { amount: 0, frequency: "ONE_TIME" };
                  const remaining   = remainingFor(paidMap, p.studentId, p.feeStructureId, structureAmount, structureFrequency);
                  const full        = fullPaymentById.get(p.id);
                  const periodLabel = full?.periodLabel;
                  const structure   = structures.find((s) => s.id === p.feeStructureId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.student?.user?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{p.feeStructure?.feeType ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{periodLabel ?? "—"}</td>
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
                              studentName:   p.student?.user?.name ?? "—",
                              feeType:       p.feeStructure?.feeType ?? "—",
                              periodLabel,
                              amountPaid:    Number(p.amountPaid),
                              remaining,
                              paymentDate:   p.paymentDate ? p.paymentDate.toISOString() : null,
                              paymentMode:   p.paymentMode,
                              status:        p.status,
                              schoolName:    school?.name ?? "School",
                              schoolCode:    school?.code ?? "",
                            }}
                          />
                          {full && (
                            <FeePaymentRowActions
                              payment={{
                                id:                        p.id,
                                amountPaid:                Number(p.amountPaid),
                                paymentDate:               p.paymentDate ? p.paymentDate.toISOString() : null,
                                paymentMode:               full.paymentMode,
                                transactionId:             full.transactionId,
                                status:                    full.status,
                                periodLabel:               full.periodLabel,
                                remarks:                   full.remarks,
                                feeStructureFrequency:     structure?.frequency,
                                feeStructureInstallments:  structure?.installments as { period: string }[] | null,
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

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} skip={skip} />
    </div>
  );
}
