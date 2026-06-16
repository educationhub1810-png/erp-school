import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, School, Users, GraduationCap, UserCheck, Building2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";

export default async function SuperAdminReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [
    totalSchools,
    activeSchools,
    totalUsers,
    usersByRole,
    schoolsWithCounts,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.user.groupBy({ by: ["role"], _count: { id: true }, where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.school.findMany({
      select: {
        id: true, name: true, code: true, isActive: true, city: true, state: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalStudents = usersByRole.find((r) => r.role === "STUDENT")?._count.id ?? 0;
  const totalTeachers = usersByRole.find((r) => r.role === "TEACHER")?._count.id ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of all schools and users on the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Schools"   value={totalSchools}   subtitle={`${activeSchools} active`}  icon={<School className="w-5 h-5" />}        color="indigo" />
        <StatCard title="Total Users"     value={totalUsers}     subtitle="Across all schools"           icon={<Users className="w-5 h-5" />}         color="blue"   />
        <StatCard title="Students"        value={totalStudents}  subtitle="Enrolled"                     icon={<GraduationCap className="w-5 h-5" />} color="green"  />
        <StatCard title="Teachers"        value={totalTeachers}  subtitle="Teaching staff"               icon={<UserCheck className="w-5 h-5" />}     color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by role */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" /> Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {usersByRole
              .sort((a, b) => b._count.id - a._count.id)
              .map((row) => (
                <div key={row.role} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700">{ROLE_LABELS[row.role as AppRole]}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min((row._count.id / (totalUsers || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-6 text-right">{row._count.id}</span>
                  </div>
                </div>
              ))}
            {usersByRole.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No users yet</p>}
          </CardContent>
        </Card>

        {/* Schools breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Schools Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {schoolsWithCounts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center px-6">No schools registered</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2 font-medium text-gray-500">School</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Location</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Users</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {schoolsWithCounts.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.code}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{[s.city, s.state].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{s._count.users}</td>
                      <td className="px-4 py-2.5">
                        <Badge className={s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
