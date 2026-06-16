import { auth } from "@/auth";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, FileText, DollarSign, BookOpen } from "lucide-react";

export default async function ParentDashboard() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Child's Attendance" value="0%" subtitle="This month" icon={<ClipboardList className="w-5 h-5" />} color="green" />
        <StatCard title="Homework Pending" value={0} subtitle="Due this week" icon={<BookOpen className="w-5 h-5" />} color="orange" />
        <StatCard title="Latest Result" value="N/A" subtitle="Last exam" icon={<FileText className="w-5 h-5" />} color="indigo" />
        <StatCard title="Fee Outstanding" value="₹0" subtitle="Pending payment" icon={<DollarSign className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Child's Progress</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">Progress data will appear here.</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">School Announcements</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No announcements.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
