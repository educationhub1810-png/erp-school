import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { DashboardHero } from "@/components/shared/dashboard-hero";
import { TwoValueDonutChart } from "@/components/dashboard/two-value-donut-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayFeeButton } from "./pay-fee-button";
import { Heart, Megaphone } from "lucide-react";
import { format, startOfMonth } from "date-fns";

export default async function ParentDashboard() {
  const session = await auth();
  const user = session ? getUser(session) : null;

  const parentProfile = user
    ? await prisma.parentProfile.findUnique({
        where: { userId: user.id },
        include: {
          student: {
            select: {
              id: true, firstName: true, middleName: true, lastName: true, schoolId: true, classId: true,
              class: { select: { name: true } }, section: { select: { name: true } },
            },
          },
        },
      })
    : null;
  const child = parentProfile?.student;
  const childName = child ? `${child.firstName} ${child.middleName ?? ""} ${child.lastName}`.replace(/\s+/g, " ").trim() : null;

  const monthStart = startOfMonth(new Date());
  monthStart.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [present, absent, applicableStructures, payments, notification] = child
    ? await Promise.all([
        prisma.attendance.count({ where: { studentId: child.id, date: { gte: monthStart, lte: today }, status: "PRESENT" } }),
        prisma.attendance.count({ where: { studentId: child.id, date: { gte: monthStart, lte: today }, status: { in: ["ABSENT", "LATE", "HALF_DAY"] } } }),
        prisma.feeStructure.findMany({ where: { schoolId: child.schoolId, OR: [{ classId: child.classId }, { classId: null }] } }),
        prisma.feePayment.findMany({ where: { studentId: child.id, status: "PAID" }, select: { amountPaid: true } }),
        prisma.notification.findFirst({
          where: { schoolId: child.schoolId, OR: [{ targetRole: "PARENT" }, { targetRole: null }] },
          orderBy: { sentAt: "desc" },
        }),
      ])
    : [0, 0, [], [], null];

  const total = present + absent;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;
  const expectedTotal = applicableStructures.reduce((sum, s) => sum + Number(s.amount), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const feeDue = Math.max(0, expectedTotal - totalPaid);
  const nextDueDate = applicableStructures
    .filter((s) => s.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0]?.dueDate;

  return (
    <div className="space-y-6">
      <DashboardHero
        gradient="from-pink-600 to-rose-700"
        title={`Welcome, ${session?.user.name ?? "Parent"}`}
        subtitle={childName ? `Parent of ${childName}${child?.class ? ` (Class ${child.class.name}${child.section ? ` - ${child.section.name}` : ""})` : ""}` : ""}
        icon={<Heart className="w-10 h-10" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Attendance</CardTitle></CardHeader>
          <CardContent>
            <TwoValueDonutChart
              primary={{ label: "Present", value: present, color: "#db2777" }}
              secondary={{ label: "Absent", value: absent, color: "#e5e7eb" }}
            />
            <p className="text-center text-sm text-gray-500 mt-1">This month{attendancePct > 0 || total > 0 ? ` · ${attendancePct}%` : ""}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Fee Due</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">₹{feeDue.toLocaleString("en-IN")}</p>
              {feeDue > 0 && nextDueDate && (
                <p className="text-xs text-gray-400 mt-1">Due Date: {format(nextDueDate, "d MMM yyyy")}</p>
              )}
            </div>
            {feeDue > 0 && <PayFeeButton />}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4" /> Recent Notification</CardTitle></CardHeader>
        <CardContent>
          {!notification ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <div>
              <p className="text-sm text-gray-700 font-medium">{notification.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{format(notification.sentAt, "d MMM yyyy")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
