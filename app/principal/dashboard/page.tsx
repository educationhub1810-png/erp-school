import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, UserCheck, ClipboardList, FileText, CalendarCheck } from "lucide-react";

export default async function PrincipalDashboard() {
  const session = await auth();
  const schoolId = session?.user.schoolId;

  const [students, teachers, pendingLeaves] = await Promise.all([
    schoolId ? prisma.student.count({ where: { schoolId, isAlumni: false } }) : 0,
    schoolId ? prisma.teacher.count({ where: { schoolId } }) : 0,
    schoolId ? prisma.leaveRequest.count({ where: { schoolId, status: "PENDING" } }) : 0,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Principal Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Students" value={students} subtitle="Total enrolled" icon={<GraduationCap className="w-5 h-5" />} color="indigo" />
        <StatCard title="Teachers" value={teachers} subtitle="Active teachers" icon={<UserCheck className="w-5 h-5" />} color="blue" />
        <StatCard title="Attendance" value="0%" subtitle="Today's overall" icon={<ClipboardList className="w-5 h-5" />} color="green" />
        <StatCard title="Pending Leaves" value={pendingLeaves} subtitle="Awaiting approval" icon={<CalendarCheck className="w-5 h-5" />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent Exam Results</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No exams published yet.</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Leave Requests</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No pending leave requests.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
