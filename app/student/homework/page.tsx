import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar } from "lucide-react";

export default async function StudentHomeworkPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const student = await prisma.student.findFirst({
    where: { user: { email: session.user.email ?? undefined } },
  });

  const homework = student ? await prisma.homework.findMany({
    where: { classId: student.classId },
    include: {
      subject: { select: { name: true } },
      submissions: { where: { studentId: student.id }, select: { id: true, submittedAt: true } },
    },
    orderBy: { dueDate: "asc" },
  }) : [];

  const now = new Date();

  const statusBadge = (hw: typeof homework[0]) => {
    const sub = hw.submissions[0];
    if (sub) return <Badge className="bg-green-100 text-green-700">Submitted</Badge>;
    if (hw.dueDate && new Date(hw.dueDate) < now) return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
  };

  const pending = homework.filter((h) => !h.submissions[0]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
          <p className="text-sm text-gray-500 mt-1">{pending} assignment{pending !== 1 ? "s" : ""} pending</p>
        </div>
      </div>

      {homework.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-400">No homework assigned.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {homework.map((hw) => (
            <Card key={hw.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{hw.title}</p>
                      <p className="text-xs text-indigo-600 mt-0.5">{hw.subject?.name}</p>
                      {hw.description && <p className="text-xs text-gray-500 mt-1">{hw.description}</p>}
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {hw.dueDate
                          ? `Due: ${new Date(hw.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                          : "No due date"}
                      </p>
                    </div>
                  </div>
                  {statusBadge(hw)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
