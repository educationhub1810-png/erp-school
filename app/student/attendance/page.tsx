import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { Pagination } from "@/components/shared/pagination";
import { ClipboardList } from "lucide-react";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function StudentAttendancePage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const student = await prisma.student.findFirst({
    where: { user: { email: session.user.email ?? undefined } },
  });
  const studentId = student?.id ?? "__none__";

  const [allRecords, records, total] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId }, select: { status: true } }),
    prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.attendance.count({ where: { studentId } }),
  ]);
  const totalPages = Math.ceil(total / limit);

  const present = allRecords.filter((r) => r.status === "PRESENT").length;
  const absent = allRecords.filter((r) => r.status === "ABSENT").length;
  const late = allRecords.filter((r) => r.status === "LATE").length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const statusStyle: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-700",
    ABSENT:  "bg-red-100 text-red-700",
    LATE:    "bg-yellow-100 text-yellow-700",
    HOLIDAY: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Your attendance record</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Attendance %" value={`${pct}%`} subtitle={`${present} of ${total} days`} icon={<ClipboardList className="w-5 h-5" />} color={pct >= 75 ? "green" : "red"} />
        <StatCard title="Present"  value={present} subtitle="Days present"  icon={<ClipboardList className="w-5 h-5" />} color="green"  />
        <StatCard title="Absent"   value={absent}  subtitle="Days absent"   icon={<ClipboardList className="w-5 h-5" />} color="red"    />
        <StatCard title="Late"     value={late}    subtitle="Days late"     icon={<ClipboardList className="w-5 h-5" />} color="orange" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No attendance records yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900">
                      {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-3">
                      <Badge className={statusStyle[r.status] ?? "bg-gray-100 text-gray-500"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{r.remarks ?? "—"}</td>
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
