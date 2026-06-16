import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Users, MapPin, DollarSign } from "lucide-react";

export default async function TransportDashboard() {
  const session = await auth();
  const schoolId = session?.user.schoolId;

  const [routes, assignedStudents] = await Promise.all([
    schoolId ? prisma.transportRoute.count({ where: { schoolId } }) : 0,
    schoolId ? prisma.transportStudent.count({ where: { schoolId } }) : 0,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transport Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Routes" value={routes} subtitle="Active routes" icon={<Bus className="w-5 h-5" />} color="indigo" />
        <StatCard title="Students" value={assignedStudents} subtitle="Using transport" icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard title="Stops" value={0} subtitle="Total bus stops" icon={<MapPin className="w-5 h-5" />} color="green" />
        <StatCard title="Fees Due" value="₹0" subtitle="Unpaid transport fees" icon={<DollarSign className="w-5 h-5" />} color="orange" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Route Overview</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-gray-500">No routes configured.</p></CardContent>
      </Card>
    </div>
  );
}
