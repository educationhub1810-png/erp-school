import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarCheck, Briefcase, DollarSign } from "lucide-react";

export default async function HrDashboard() {
  const session = await auth();
  const schoolId = session?.user.schoolId;

  const [employees, pendingLeaves, openPositions] = await Promise.all([
    schoolId ? prisma.staff.count({ where: { schoolId } }) : 0,
    schoolId ? prisma.leaveRequest.count({ where: { schoolId, status: "PENDING" } }) : 0,
    schoolId ? prisma.recruitment.count({ where: { schoolId, status: "OPEN" } }) : 0,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Employees" value={employees} subtitle="Total staff" icon={<Users className="w-5 h-5" />} color="indigo" />
        <StatCard title="Leave Requests" value={pendingLeaves} subtitle="Pending approval" icon={<CalendarCheck className="w-5 h-5" />} color="orange" />
        <StatCard title="Open Positions" value={openPositions} subtitle="Active recruitment" icon={<Briefcase className="w-5 h-5" />} color="blue" />
        <StatCard title="Payroll Due" value="₹0" subtitle="This month" icon={<DollarSign className="w-5 h-5" />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Pending Leave Requests</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No pending requests.</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Open Recruitments</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No open positions.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
