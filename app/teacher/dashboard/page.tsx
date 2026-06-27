import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { DashboardHero } from "@/components/shared/dashboard-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardList, FileText, Users } from "lucide-react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TeacherDashboard() {
  const session = await auth();
  const teacher = session?.user.id
    ? await prisma.teacher.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;

  const todayDow = new Date().getDay();

  const [classRows, todaysClasses, pendingReview] = teacher
    ? await Promise.all([
        prisma.subject.findMany({ where: { teacherId: teacher.id }, select: { classId: true, class: { select: { name: true } } }, distinct: ["classId"] }),
        prisma.timetable.findMany({
          where: { teacherId: teacher.id, dayOfWeek: todayDow },
          include: { subject: { select: { name: true } }, class: { select: { name: true } }, section: { select: { name: true } } },
          orderBy: { startTime: "asc" },
        }),
        prisma.homeworkSubmission.count({ where: { marks: null, homework: { teacherId: teacher.id } } }),
      ])
    : [[], [], 0];

  const classIds = classRows.map((c) => c.classId);
  const studentsCount = classIds.length ? await prisma.student.count({ where: { classId: { in: classIds }, isAlumni: false } }) : 0;

  return (
    <div className="space-y-6">
      <DashboardHero
        gradient="from-blue-600 to-indigo-700"
        title="Welcome Teacher"
        subtitle="Manage your classes and students."
        icon={<BookOpen className="w-10 h-10" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Classes" value={classRows.length} subtitle="Assigned classes" icon={<BookOpen className="w-5 h-5" />} color="indigo" />
        <StatCard title="Students" value={studentsCount} subtitle="Across your classes" icon={<Users className="w-5 h-5" />} color="green" />
        <StatCard title="Today's Lectures" value={todaysClasses.length} subtitle="Scheduled today" icon={<ClipboardList className="w-5 h-5" />} color="blue" />
        <StatCard title="To Review" value={pendingReview} subtitle="Homework submissions" icon={<FileText className="w-5 h-5" />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Today&apos;s Classes ({DAY_NAMES[todayDow]})</CardTitle></CardHeader>
          <CardContent>
            {todaysClasses.length === 0 ? (
              <p className="text-sm text-gray-500">No classes scheduled today.</p>
            ) : (
              <ul className="space-y-2">
                {todaysClasses.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {t.class.name}{t.section ? ` - ${t.section.name}` : ""} <span className="text-gray-400">· {t.subject.name}</span>
                    </span>
                    <span className="text-gray-500 font-medium">{t.startTime}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700" nativeButton={false} render={<a href="/teacher/attendance" />}>
              Mark Attendance
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" nativeButton={false} render={<a href="/teacher/homework" />}>
              Add Homework
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
