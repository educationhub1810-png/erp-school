import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, TrendingUp, Users } from "lucide-react";

export default async function AccountantDashboard() {
  const session = await auth();
  const schoolId = session?.user.schoolId;

  const [totalPayments, pendingPayments] = await Promise.all([
    schoolId ? prisma.feePayment.aggregate({ where: { schoolId }, _sum: { amountPaid: true } }) : { _sum: { amountPaid: 0 } },
    schoolId ? prisma.feePayment.count({ where: { schoolId, status: "PENDING" } }) : 0,
  ]);

  const totalCollected = totalPayments._sum.amountPaid ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Collected" value={`₹${totalCollected.toLocaleString()}`} subtitle="All time" icon={<DollarSign className="w-5 h-5" />} color="green" />
        <StatCard title="This Month" value="₹0" subtitle="Fee collection" icon={<TrendingUp className="w-5 h-5" />} color="indigo" />
        <StatCard title="Pending" value={pendingPayments} subtitle="Unpaid invoices" icon={<FileText className="w-5 h-5" />} color="orange" />
        <StatCard title="Defaulters" value={0} subtitle="Overdue payments" icon={<Users className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent Payments</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No recent payments.</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Fee Defaulters</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No defaulters found.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
