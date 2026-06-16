import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, UserCheck, DollarSign, ClipboardList, BookOpen } from "lucide-react";

export default async function SchoolAdminDashboard() {
  const session = await auth();
  const schoolId = session?.user.schoolId;

  const [students, teachers, staff, classes] = await Promise.all([
    schoolId ? prisma.student.count({ where: { schoolId, isAlumni: false } }) : 0,
    schoolId ? prisma.teacher.count({ where: { schoolId } }) : 0,
    schoolId ? prisma.staff.count({ where: { schoolId } }) : 0,
    schoolId ? prisma.class.count({ where: { schoolId } }) : 0,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back, {session?.user.name}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Students"
          value={students}
          subtitle="Enrolled students"
          icon={<GraduationCap className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Teachers"
          value={teachers}
          subtitle="Teaching staff"
          icon={<UserCheck className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Staff"
          value={staff}
          subtitle="Non-teaching staff"
          icon={<Users className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Classes"
          value={classes}
          subtitle="Active classes"
          icon={<BookOpen className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Fee Collection"
          value="₹0"
          subtitle="This month"
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Attendance Today"
          value="0%"
          subtitle="Overall attendance"
          icon={<ClipboardList className="w-5 h-5" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Admissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No recent admissions.</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No announcements yet.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
