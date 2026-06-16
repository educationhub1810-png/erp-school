import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Users, GraduationCap, Building2 } from "lucide-react";

export default async function SuperAdminDashboard() {
  const session = await auth();

  const [totalSchools, totalUsers, activeSchools] = await Promise.all([
    prisma.school.count(),
    prisma.user.count(),
    prisma.school.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back, {session?.user.name}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Schools"
          value={totalSchools}
          subtitle="Registered on platform"
          icon={<School className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Active Schools"
          value={activeSchools}
          subtitle="Currently active"
          icon={<Building2 className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Total Users"
          value={totalUsers}
          subtitle="Across all schools"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Super Admins"
          value={1}
          subtitle="System administrators"
          icon={<GraduationCap className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No schools registered yet.</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Platform Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Activity data will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
