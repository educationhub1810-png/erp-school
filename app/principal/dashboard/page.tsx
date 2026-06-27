import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { DashboardHero } from "@/components/shared/dashboard-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, UserCheck, ClipboardList, CalendarCheck } from "lucide-react";

function pct(obtained: number, total: number) {
  return total > 0 ? Math.round((obtained / total) * 100) : 0;
}

export default async function PrincipalDashboard() {
  const session = await auth();
  const schoolId = session?.user.schoolId;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [students, teachers, leaveRequests, presentToday, markedToday, examResults, leaderboardExams] = await Promise.all([
    schoolId ? prisma.student.count({ where: { schoolId, isAlumni: false } }) : 0,
    schoolId ? prisma.teacher.count({ where: { schoolId } }) : 0,
    schoolId
      ? prisma.leaveRequest.findMany({
          where: { schoolId, status: "PENDING" },
          include: { user: { select: { name: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [],
    schoolId ? prisma.attendance.count({ where: { schoolId, date: today, status: "PRESENT" } }) : 0,
    schoolId ? prisma.attendance.count({ where: { schoolId, date: today, status: { not: "HOLIDAY" } } }) : 0,
    schoolId
      ? prisma.examResult.findMany({
          where: { exam: { schoolId }, isAbsent: false, marksObtained: { not: null } },
          select: { marksObtained: true, examSchedule: { select: { totalMarks: true } }, exam: { select: { classId: true, startDate: true } } },
        })
      : [],
    schoolId
      ? prisma.exam.findMany({
          where: { schoolId, isPublished: true },
          orderBy: { startDate: "desc" },
          select: { id: true, startDate: true },
          take: 2,
        })
      : [],
  ]);

  const attendanceTodayPct = pct(presentToday, markedToday);

  // Academic performance: average % across every scored result school-wide.
  const scored = examResults.filter((r) => r.examSchedule?.totalMarks);
  const overallAvgPct = scored.length
    ? Math.round(scored.reduce((sum, r) => sum + pct(r.marksObtained!, r.examSchedule!.totalMarks), 0) / scored.length)
    : 0;

  // Trend vs the previous exam, only if there are at least two to compare.
  let trend: { value: number; label: string } | undefined;
  if (leaderboardExams.length === 2) {
    const [latest, previous] = leaderboardExams;
    const avg = (rows: typeof scored) =>
      rows.length ? rows.reduce((sum, r) => sum + pct(r.marksObtained!, r.examSchedule!.totalMarks), 0) / rows.length : null;
    const latestAvg = avg(scored.filter((r) => r.exam.startDate?.getTime() === latest.startDate?.getTime()));
    const previousAvg = avg(scored.filter((r) => r.exam.startDate?.getTime() === previous.startDate?.getTime()));
    if (latestAvg != null && previousAvg != null) {
      trend = { value: Math.round(latestAvg - previousAvg), label: "from last term" };
    }
  }

  // Top performing classes: average % grouped by class.
  const byClass = new Map<string, { sum: number; count: number }>();
  for (const r of scored) {
    const entry = byClass.get(r.exam.classId) ?? { sum: 0, count: 0 };
    entry.sum += pct(r.marksObtained!, r.examSchedule!.totalMarks);
    entry.count += 1;
    byClass.set(r.exam.classId, entry);
  }
  const classIds = [...byClass.keys()];
  const classNames = classIds.length
    ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
    : [];
  const topClasses = classIds
    .map((id) => ({ name: classNames.find((c) => c.id === id)?.name ?? "—", avg: Math.round(byClass.get(id)!.sum / byClass.get(id)!.count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <DashboardHero
        gradient="from-violet-600 to-purple-700"
        title="Welcome Principal"
        subtitle="Monitor and improve academic excellence."
        icon={<GraduationCap className="w-10 h-10" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Academic Performance" value={`${overallAvgPct}%`} trend={trend} icon={<GraduationCap className="w-5 h-5" />} color="purple" />
        <StatCard title="Attendance" value={`${attendanceTodayPct}%`} subtitle="Today's overall" icon={<ClipboardList className="w-5 h-5" />} color="green" />
        <StatCard title="Students" value={students} subtitle="Total enrolled" icon={<GraduationCap className="w-5 h-5" />} color="indigo" />
        <StatCard title="Teachers" value={teachers} subtitle="Active teachers" icon={<UserCheck className="w-5 h-5" />} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Performing Classes</CardTitle></CardHeader>
          <CardContent>
            {topClasses.length === 0 ? (
              <p className="text-sm text-gray-500">No published exam results yet.</p>
            ) : (
              <div className="space-y-3">
                {topClasses.map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{c.name}</span>
                      <span className="font-medium text-gray-900">{c.avg}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-violet-600" style={{ width: `${c.avg}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Pending Leave Requests</CardTitle></CardHeader>
          <CardContent>
            {leaveRequests.length === 0 ? (
              <p className="text-sm text-gray-500">No pending leave requests.</p>
            ) : (
              <ul className="space-y-2">
                {leaveRequests.map((lr) => (
                  <li key={lr.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{lr.user.name}</span>
                    <span className="text-gray-400 text-xs">{lr.leaveType.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
