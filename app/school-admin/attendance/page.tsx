import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { AttendanceMarker } from "@/components/shared/attendance-marker";
import { sortClassesByGrade } from "@/lib/class-order";
import { ClipboardList } from "lucide-react";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AttendancePage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [allTodayRecords, todayRecords, total, totalStudents, classesRaw] = await Promise.all([
    prisma.attendance.findMany({
      where: { schoolId, date: { gte: today } },
      select: { status: true },
    }),
    prisma.attendance.findMany({
      where: { schoolId, date: { gte: today } },
      include: { student: { include: { user: { select: { name: true } }, class: { select: { name: true } } } } },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.attendance.count({ where: { schoolId, date: { gte: today } } }),
    prisma.student.count({ where: { schoolId } }),
    prisma.class.findMany({
      where: { schoolId },
      include: { sections: { select: { id: true, name: true } } },
    }),
  ]);
  const totalPages = Math.ceil(total / limit);
  const classes = sortClassesByGrade(classesRaw);

  const present = allTodayRecords.filter((r) => r.status === "PRESENT").length;
  const absent  = allTodayRecords.filter((r) => r.status === "ABSENT").length;
  const late    = allTodayRecords.filter((r) => r.status === "LATE").length;

  const statusStyle: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-700",
    ABSENT:  "bg-red-100 text-red-700",
    LATE:    "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Today — {today.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={totalStudents} subtitle="Enrolled" icon={<ClipboardList className="w-5 h-5" />} color="indigo" />
        <StatCard title="Present" value={present} subtitle="Today" icon={<ClipboardList className="w-5 h-5" />} color="green" />
        <StatCard title="Absent"  value={absent}  subtitle="Today" icon={<ClipboardList className="w-5 h-5" />} color="red"   />
        <StatCard title="Late"    value={late}    subtitle="Today" icon={<ClipboardList className="w-5 h-5" />} color="orange"/>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Mark / Edit Attendance</h2>
        <AttendanceMarker classes={classes} />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Today's Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No attendance marked today.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Student</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Class</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {todayRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{r.student?.user?.name}</td>
                    <td className="px-6 py-3 text-gray-500">{r.student?.class?.name ?? "—"}</td>
                    <td className="px-6 py-3"><Badge className={statusStyle[r.status]}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} skip={skip} />
    </div>
  );
}
