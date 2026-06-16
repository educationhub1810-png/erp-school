import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ClipboardList, FileText, Video } from "lucide-react";

export default async function TeacherDashboard() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Classes" value={0} subtitle="Assigned classes" icon={<BookOpen className="w-5 h-5" />} color="indigo" />
        <StatCard title="Pending Homework" value={0} subtitle="To be reviewed" icon={<FileText className="w-5 h-5" />} color="orange" />
        <StatCard title="Today's Lectures" value={0} subtitle="Scheduled today" icon={<ClipboardList className="w-5 h-5" />} color="blue" />
        <StatCard title="LMS Courses" value={0} subtitle="Active courses" icon={<Video className="w-5 h-5" />} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Today's Timetable</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No classes scheduled today.</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Pending Homework Submissions</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No submissions pending.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
