import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrowthTrendChart } from "@/components/dashboard/growth-trend-chart";
import { TwoValueDonutChart } from "@/components/dashboard/two-value-donut-chart";
import {
  School, Users, GraduationCap, UserCheck, ListTodo,
  Home, Bug, BarChart3,
} from "lucide-react";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function SuperAdminDashboard() {
  const session = await auth();

  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [
    totalSchools,
    activeSchools,
    totalUsers,
    totalStudents,
    totalTeachers,
    pendingBugs,
    recentSchools,
    schoolsSinceWindow,
    latestStudent,
    latestTeacher,
    latestParent,
    latestBug,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.student.count({ where: { isAlumni: false } }),
    prisma.teacher.count(),
    prisma.bugTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.school.findMany({ orderBy: { createdAt: "desc" }, take: 1, select: { name: true, code: true, createdAt: true } }),
    prisma.school.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.student.findFirst({ orderBy: { admissionDate: "desc" }, select: { firstName: true, lastName: true, admissionDate: true, school: { select: { name: true } } } }),
    prisma.teacher.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, user: { select: { name: true } }, school: { select: { name: true } } } }),
    prisma.user.findFirst({ where: { role: "PARENT" }, orderBy: { createdAt: "desc" }, select: { name: true, createdAt: true, school: { select: { name: true } } } }),
    prisma.bugTicket.findFirst({ orderBy: { createdAt: "desc" }, select: { title: true, createdAt: true } }),
  ]);

  const monthBuckets = new Map<string, number>();
  for (const s of schoolsSinceWindow) {
    const key = `${s.createdAt.getFullYear()}-${s.createdAt.getMonth()}`;
    monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
  }
  const growthTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return { label: MONTH_LABELS[d.getMonth()], count: monthBuckets.get(key) ?? 0 };
  });

  const inactiveSchools = totalSchools - activeSchools;

  const activities = [
    recentSchools[0] && {
      icon: School, color: "text-indigo-600 bg-indigo-100",
      label: "New School Registered", time: recentSchools[0].createdAt,
      detail: `${recentSchools[0].name} (${recentSchools[0].code})`,
    },
    latestStudent && {
      icon: GraduationCap, color: "text-blue-600 bg-blue-100",
      label: "New Student Admission", time: latestStudent.admissionDate,
      detail: `${latestStudent.firstName} ${latestStudent.lastName} · ${latestStudent.school?.name ?? ""}`,
    },
    latestTeacher && {
      icon: UserCheck, color: "text-green-600 bg-green-100",
      label: "New Teacher Added", time: latestTeacher.createdAt,
      detail: `${latestTeacher.user.name} · ${latestTeacher.school.name}`,
    },
    latestParent && {
      icon: Home, color: "text-purple-600 bg-purple-100",
      label: "New Parent Account", time: latestParent.createdAt,
      detail: `${latestParent.name} · ${latestParent.school?.name ?? ""}`,
    },
    latestBug && {
      icon: Bug, color: "text-red-600 bg-red-100",
      label: "Bug Reported", time: latestBug.createdAt,
      detail: latestBug.title,
    },
  ].filter((a): a is NonNullable<typeof a> => !!a)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  const quickAccess = [
    { label: "Add School", href: "/super-admin/schools", icon: School, color: "bg-indigo-100 text-indigo-600" },
    { label: "Add Student", href: "/super-admin/students", icon: GraduationCap, color: "bg-blue-100 text-blue-600" },
    { label: "Add Teacher", href: "/super-admin/teachers", icon: UserCheck, color: "bg-green-100 text-green-600" },
    { label: "Add Parent", href: "/super-admin/parents", icon: Home, color: "bg-purple-100 text-purple-600" },
    { label: "Manage Users", href: "/super-admin/users", icon: Users, color: "bg-orange-100 text-orange-600" },
    { label: "Bug Board", href: "/super-admin/bugs", icon: Bug, color: "bg-red-100 text-red-600" },
    { label: "View Reports", href: "/super-admin/reports", icon: BarChart3, color: "bg-cyan-100 text-cyan-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {session?.user.name} · {today.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Schools" value={totalSchools} subtitle="Registered on platform" icon={<School className="w-5 h-5" />} color="indigo" />
        <StatCard title="Total Students" value={totalStudents} subtitle="Across all schools" icon={<GraduationCap className="w-5 h-5" />} color="blue" />
        <StatCard title="Total Teachers" value={totalTeachers} subtitle="Across all schools" icon={<UserCheck className="w-5 h-5" />} color="green" />
        <StatCard title="Total Users" value={totalUsers} subtitle="All roles" icon={<Users className="w-5 h-5" />} color="purple" />
        <StatCard title="Pending Tasks" value={pendingBugs} subtitle="Open bug tickets" icon={<ListTodo className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">School Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthTrendChart data={growthTrend} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">School Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <TwoValueDonutChart
              primary={{ label: "Active", value: activeSchools, color: "#22c55e" }}
              secondary={{ label: "Inactive", value: inactiveSchools, color: "#e5e7eb" }}
            />
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div>
                  <p className="text-gray-500 text-xs">Active</p>
                  <p className="font-semibold text-gray-900">{activeSchools}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <div>
                  <p className="text-gray-500 text-xs">Inactive</p>
                  <p className="font-semibold text-gray-900">{inactiveSchools}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <div>
                  <p className="text-gray-500 text-xs">Total</p>
                  <p className="font-semibold text-gray-900">{totalSchools}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No recent activity.</p>
            ) : (
              activities.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
                    <a.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.label}</p>
                    {a.detail && <p className="text-xs text-gray-400 truncate">{a.detail}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(a.time).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {quickAccess.map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${q.color}`}>
                <q.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
