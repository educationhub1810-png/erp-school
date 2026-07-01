import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { Pagination } from "@/components/shared/pagination";
import { buildPaidMap, remainingFor, installmentCount } from "@/lib/fees";
import { DownloadReceiptButton } from "@/components/shared/download-receipt-button";
import { IndianRupee } from "lucide-react";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function StudentFeesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const student = await prisma.student.findFirst({
    where: { user: { email: session.user.email ?? undefined } },
  });
  const studentId = student?.id ?? "__none__";

  const [allPayments, payments, total, applicableStructures, school] = await Promise.all([
    prisma.feePayment.findMany({ where: { studentId }, select: { studentId: true, feeStructureId: true, amountPaid: true, status: true } }),
    prisma.feePayment.findMany({
      where: { studentId },
      include: { feeStructure: { select: { amount: true, feeType: true, frequency: true } } },
      orderBy: { paymentDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.feePayment.count({ where: { studentId } }),
    student
      ? prisma.feeStructure.findMany({
          where: { schoolId: student.schoolId, OR: [{ classId: student.classId }, { classId: null }] },
        })
      : Promise.resolve([]),
    student ? prisma.school.findUnique({ where: { id: student.schoolId }, select: { name: true, code: true } }) : Promise.resolve(null),
  ]);
  const studentName = student ? `${student.firstName} ${student.lastName}` : "—";
  const totalPages = Math.ceil(total / limit);
  const structureById = new Map(applicableStructures.map((s) => [s.id, { amount: Number(s.amount), frequency: s.frequency }]));
  const paidMap = buildPaidMap(allPayments);

  const totalPaid = allPayments.filter((p) => p.status === "PAID" || p.status === "PARTIAL").reduce((s, p) => s + Number(p.amountPaid), 0);
  const expectedTotal = applicableStructures.reduce(
    (sum, s) => sum + Number(s.amount) * installmentCount(s.frequency),
    0,
  );
  const totalDue = Math.max(0, expectedTotal - totalPaid);

  const statusStyle: Record<string, string> = {
    PAID:      "bg-green-100 text-green-700",
    PENDING:   "bg-yellow-100 text-yellow-700",
    OVERDUE:   "bg-red-100 text-red-700",
    WAIVED:    "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fees</h1>
        <p className="text-sm text-gray-500 mt-1">Your fee payment history</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Paid" value={`₹${totalPaid.toLocaleString("en-IN")}`} subtitle="Amount paid" icon={<IndianRupee className="w-5 h-5" />} color="green" />
        <StatCard title="Amount Due"  value={`₹${totalDue.toLocaleString("en-IN")}`}  subtitle="Pending payment" icon={<IndianRupee className="w-5 h-5" />} color={totalDue > 0 ? "red" : "green"} />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No fee records found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Fee Type</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Period</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Balance</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => {
                  const struct = structureById.get(p.feeStructureId);
                  const structureAmount    = struct?.amount ?? Number(p.feeStructure?.amount ?? 0);
                  const structureFrequency = struct?.frequency ?? p.feeStructure?.frequency ?? "ONE_TIME";
                  const remaining = remainingFor(paidMap, p.studentId, p.feeStructureId, structureAmount, structureFrequency);
                  const periodLabel = p.periodLabel;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{p.feeStructure?.feeType ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{periodLabel ?? "—"}</td>
                      <td className="px-6 py-3 text-right text-gray-700">₹{Number(p.amountPaid).toLocaleString("en-IN")}</td>
                      <td className={`px-6 py-3 text-right ${remaining > 0 ? "text-red-600 font-medium" : "text-gray-400"}`}>₹{remaining.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {p.paymentDate
                          ? new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge className={statusStyle[p.status] ?? "bg-gray-100 text-gray-500"}>{p.status}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <DownloadReceiptButton
                          receipt={{
                            receiptNumber: p.receiptNumber,
                            studentName,
                            feeType:      p.feeStructure?.feeType ?? "—",
                            periodLabel,
                            amountPaid:   Number(p.amountPaid),
                            remaining,
                            paymentDate:  p.paymentDate ? p.paymentDate.toISOString() : null,
                            paymentMode:  p.paymentMode,
                            status:       p.status,
                            schoolName:   school?.name ?? "School",
                            schoolCode:   school?.code ?? "",
                          }}
                        />
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
