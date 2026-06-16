import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, BedDouble, DollarSign } from "lucide-react";

export default async function WardenDashboard() {
  const session = await auth();
  const schoolId = session?.user.schoolId;

  const [rooms, allocations] = await Promise.all([
    schoolId ? prisma.hostelRoom.count({ where: { schoolId } }) : 0,
    schoolId ? prisma.hostelAllocation.count({ where: { schoolId } }) : 0,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Warden Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Rooms" value={rooms} subtitle="Total rooms" icon={<Building2 className="w-5 h-5" />} color="indigo" />
        <StatCard title="Occupied" value={allocations} subtitle="Occupied beds" icon={<BedDouble className="w-5 h-5" />} color="blue" />
        <StatCard title="Students" value={allocations} subtitle="In hostel" icon={<Users className="w-5 h-5" />} color="green" />
        <StatCard title="Fees Due" value="₹0" subtitle="Unpaid hostel fees" icon={<DollarSign className="w-5 h-5" />} color="orange" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Room Status</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-gray-500">No rooms configured.</p></CardContent>
      </Card>
    </div>
  );
}
