import { auth } from "@/auth";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, FileText, DollarSign, BookOpen } from "lucide-react";

export default async function StudentDashboard() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Attendance" value="0%" subtitle="This month" icon={<ClipboardList className="w-5 h-5" />} color="green" />
        <StatCard title="Pending Homework" value={0} subtitle="Due soon" icon={<BookOpen className="w-5 h-5" />} color="orange" />
        <StatCard title="Exam Results" value={0} subtitle="Results published" icon={<FileText className="w-5 h-5" />} color="indigo" />
        <StatCard title="Fee Due" value="₹0" subtitle="Outstanding amount" icon={<DollarSign className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Today's Schedule</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No classes today.</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Announcements</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No announcements.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
