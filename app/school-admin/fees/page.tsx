import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { DollarSign } from "lucide-react";

export default async function FeesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const schoolId = (session.user as any).schoolId;

  const [payments, structures] = await Promise.all([
    prisma.feePayment.findMany({
      where: { schoolId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        feeStructure: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.feeStructure.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
  ]);

  const totalCollected = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending   = payments.filter((p) => p.status === "PENDING").reduce((s, p) => s + Number(p.amount), 0);

  const statusStyle: Record<string, string> = {
    PAID: "bg-green-100 text-green-700", PENDING: "bg-yellow-100 text-yellow-700",
    OVERDUE: "bg-red-100 text-red-700",  WAIVED: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
        <p className="text-sm text-gray-500 mt-1">{structures.length} fee structures · {payments.length} transactions</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Collected" value={`₹${totalCollected.toLocaleString("en-IN")}`} subtitle="Paid" icon={<DollarSign className="w-5 h-5" />} color="green" />
        <StatCard title="Pending"         value={`₹${totalPending.toLocaleString("en-IN")}`}   subtitle="Outstanding" icon={<DollarSign className="w-5 h-5" />} color="red" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Recent Payments</CardTitle></CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No payments found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Student</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Fee Type</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{p.student?.user?.name ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-500">{p.feeStructure?.name ?? "—"}</td>
                    <td className="px-6 py-3 text-right text-gray-700">₹{Number(p.amount).toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-6 py-3"><Badge className={statusStyle[p.status] ?? ""}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
