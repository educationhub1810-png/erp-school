import { auth } from "@/auth";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Users, ClipboardList, BarChart3 } from "lucide-react";

export default async function MessDashboard() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mess Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Meals" value={0} subtitle="Meals served" icon={<Utensils className="w-5 h-5" />} color="indigo" />
        <StatCard title="Students" value={0} subtitle="Enrolled in mess" icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard title="Attendance" value="0%" subtitle="Today's mess attendance" icon={<ClipboardList className="w-5 h-5" />} color="green" />
        <StatCard title="Monthly Cost" value="₹0" subtitle="Food expenses" icon={<BarChart3 className="w-5 h-5" />} color="orange" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Today's Menu</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-gray-500">No menu set for today.</p></CardContent>
      </Card>
    </div>
  );
}
