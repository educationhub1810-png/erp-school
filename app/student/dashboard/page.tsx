import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHero } from "@/components/shared/dashboard-hero";
import { TwoValueDonutChart } from "@/components/dashboard/two-value-donut-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, BookOpen, FileText, Megaphone } from "lucide-react";
import { format, startOfMonth } from "date-fns";

const QUICK_LINKS = [
  { label: "Timetable", href: "/student/timetable", icon: Calendar },
  { label: "Homework", href: "/student/homework", icon: BookOpen },
  { label: "Results", href: "/student/results", icon: FileText },
  { label: "Notice Board", href: null, icon: Megaphone },
];

export default async function StudentDashboard() {
  const session = await auth();
  const student = session?.user.id
    ? await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { id: true, firstName: true, classId: true, class: { select: { name: true } }, section: { select: { name: true } } },
      })
    : null;

  const monthStart = startOfMonth(new Date());
  monthStart.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [present, absent, upcomingExam] = student
    ? await Promise.all([
        prisma.attendance.count({ where: { studentId: student.id, date: { gte: monthStart, lte: today }, status: "PRESENT" } }),
        prisma.attendance.count({ where: { studentId: student.id, date: { gte: monthStart, lte: today }, status: { in: ["ABSENT", "LATE", "HALF_DAY"] } } }),
        prisma.examSchedule.findFirst({
          where: { exam: { classId: student.classId }, date: { gte: today } },
          orderBy: { date: "asc" },
          include: { subject: { select: { name: true } }, exam: { select: { name: true } } },
        }),
      ])
    : [0, 0, null];

  const total = present + absent;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <DashboardHero
        gradient="from-indigo-600 to-indigo-800"
        title={`Welcome, ${student?.firstName ?? session?.user.name ?? "Student"}`}
        subtitle={student?.class ? `${student.class.name}${student.section ? ` - ${student.section.name}` : ""}` : ""}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Attendance</CardTitle></CardHeader>
          <CardContent>
            <TwoValueDonutChart
              primary={{ label: "Present", value: present, color: "#16a34a" }}
              secondary={{ label: "Absent", value: absent, color: "#e5e7eb" }}
            />
            <p className="text-center text-sm text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_LINKS.map(({ label, href, icon: Icon }) =>
                href ? (
                  <Button key={label} variant="outline" className="h-20 flex-col gap-1.5" nativeButton={false} render={<a href={href} />}>
                    <Icon className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ) : (
                  <Button key={label} variant="outline" className="h-20 flex-col gap-1.5" disabled>
                    <Icon className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Upcoming Exam</CardTitle></CardHeader>
        <CardContent>
          {!upcomingExam ? (
            <p className="text-sm text-gray-500">No upcoming exams scheduled.</p>
          ) : (
            <p className="text-sm text-gray-700">
              {upcomingExam.subject.name} <span className="text-gray-400">({upcomingExam.exam.name})</span>
              {upcomingExam.date && <span className="text-gray-500"> — {format(upcomingExam.date, "d MMM yyyy")}</span>}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
