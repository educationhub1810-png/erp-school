import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { FeesDonutChart } from "@/components/dashboard/fees-donut-chart";
import {
  GraduationCap, UserCheck, ClipboardList, DollarSign, ListTodo,
  UserPlus, FileText, MessageSquare, BarChart3, UserCog,
} from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function SchoolAdminDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    totalStudents,
    totalTeachers,
    todayAttendance,
    weekAttendance,
    feePayments,
    pendingLeaves,
    openBugs,
    latestStudent,
    latestFeePayment,
    latestExam,
    latestHomework,
    latestStaffAttendance,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, isAlumni: false } }),
    prisma.teacher.count({ where: { schoolId } }),
    prisma.attendance.findMany({ where: { schoolId, date: { gte: today } }, select: { status: true } }),
    prisma.attendance.findMany({
      where: { schoolId, date: { gte: weekStart } },
      select: { date: true, status: true },
    }),
    prisma.feePayment.findMany({ where: { schoolId }, select: { amountPaid: true, status: true } }),
    prisma.leaveRequest.count({ where: { schoolId, status: "PENDING" } }),
    prisma.bugTicket.count({ where: { schoolId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.student.findFirst({
      where: { schoolId }, orderBy: { admissionDate: "desc" },
      select: { firstName: true, lastName: true, admissionDate: true },
    }),
    prisma.feePayment.findFirst({
      where: { schoolId }, orderBy: { paymentDate: "desc" },
      select: { amountPaid: true, paymentDate: true },
    }),
    prisma.exam.findFirst({
      where: { schoolId }, orderBy: { createdAt: "desc" },
      select: { name: true, createdAt: true },
    }),
    prisma.homework.findFirst({
      where: { schoolId }, orderBy: { createdAt: "desc" },
      select: { title: true, createdAt: true },
    }),
    prisma.staffAttendance.findFirst({
      where: { schoolId }, orderBy: { date: "desc" },
      select: { date: true },
    }),
  ]);

  const presentToday = todayAttendance.filter((r) => r.status === "PRESENT").length;
  const attendancePct = todayAttendance.length > 0 ? Math.round((presentToday / todayAttendance.length) * 100) : 0;

  const collected = feePayments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountPaid, 0);
  const pending = feePayments.filter((p) => p.status !== "PAID").reduce((s, p) => s + p.amountPaid, 0);

  const pendingTasks = pendingLeaves + openBugs;

  const trendByDay = new Map<string, { present: number; total: number }>();
  for (const r of weekAttendance) {
    const key = new Date(r.date).toDateString();
    const entry = trendByDay.get(key) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (r.status === "PRESENT") entry.present += 1;
    trendByDay.set(key, entry);
  }
  const attendanceTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const entry = trendByDay.get(d.toDateString());
    return {
      day: DAY_LABELS[d.getDay()],
      percent: entry && entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0,
    };
  });

  const activities = [
    latestStudent && {
      icon: UserPlus, color: "text-blue-600 bg-blue-100",
      label: "New Student Admission", time: latestStudent.admissionDate,
      detail: `${latestStudent.firstName} ${latestStudent.lastName}`,
    },
    latestFeePayment && {
      icon: DollarSign, color: "text-green-600 bg-green-100",
      label: "Fees Collected", time: latestFeePayment.paymentDate,
      detail: `₹${latestFeePayment.amountPaid.toLocaleString("en-IN")}`,
    },
    latestExam && {
      icon: FileText, color: "text-orange-600 bg-orange-100",
      label: "Exam Scheduled", time: latestExam.createdAt,
      detail: latestExam.name,
    },
    latestHomework && {
      icon: ClipboardList, color: "text-purple-600 bg-purple-100",
      label: "Homework Uploaded", time: latestHomework.createdAt,
      detail: latestHomework.title,
    },
    latestStaffAttendance && {
      icon: UserCheck, color: "text-pink-600 bg-pink-100",
      label: "Staff Attendance Marked", time: latestStaffAttendance.date,
      detail: null,
    },
  ].filter((a): a is NonNullable<typeof a> => !!a)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  const quickAccess = [
    { label: "Add Student", href: "/school-admin/students", icon: GraduationCap, color: "bg-blue-100 text-blue-600" },
    { label: "Add Teacher", href: "/school-admin/teachers", icon: UserCheck, color: "bg-green-100 text-green-600" },
    { label: "Mark Attendance", href: "/school-admin/attendance", icon: ClipboardList, color: "bg-purple-100 text-purple-600" },
    { label: "Collect Fees", href: "/school-admin/fees", icon: DollarSign, color: "bg-orange-100 text-orange-600" },
    { label: "Exam Schedule", href: "/school-admin/exams", icon: FileText, color: "bg-pink-100 text-pink-600" },
    { label: "Create Notice", href: "/school-admin/communication", icon: MessageSquare, color: "bg-cyan-100 text-cyan-600" },
    { label: "View Reports", href: "/school-admin/reports", icon: BarChart3, color: "bg-indigo-100 text-indigo-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            {today.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Students" value={totalStudents} subtitle="Enrolled students" icon={<GraduationCap className="w-5 h-5" />} color="blue" />
        <StatCard title="Teachers" value={totalTeachers} subtitle="Teaching staff" icon={<UserCheck className="w-5 h-5" />} color="green" />
        <StatCard title="Attendance" value={`${attendancePct}%`} subtitle="Today" icon={<UserCog className="w-5 h-5" />} color="purple" />
        <StatCard title="Fees Collection" value={`₹${collected.toLocaleString("en-IN")}`} subtitle="Collected" icon={<DollarSign className="w-5 h-5" />} color="orange" />
        <StatCard title="Pending Tasks" value={pendingTasks} subtitle="Need attention" icon={<ListTodo className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={attendanceTrend} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fees Collection</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <FeesDonutChart collected={collected} pending={pending} />
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div>
                  <p className="text-gray-500 text-xs">Collected</p>
                  <p className="font-semibold text-gray-900">₹{collected.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <div>
                  <p className="text-gray-500 text-xs">Pending</p>
                  <p className="font-semibold text-gray-900">₹{pending.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <div>
                  <p className="text-gray-500 text-xs">Total</p>
                  <p className="font-semibold text-gray-900">₹{(collected + pending).toLocaleString("en-IN")}</p>
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
