import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateExamDialog } from "@/components/shared/create-exam-dialog";
import { ExamRowActions } from "@/components/shared/exam-row-actions";
import { sortClassesByGrade } from "@/lib/class-order";
import { FileText } from "lucide-react";

export default async function TeacherExamsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const [exams, classesRaw] = await Promise.all([
    prisma.exam.findMany({
      where: { schoolId },
      include: { class: { select: { name: true } }, _count: { select: { schedules: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } }),
  ]);
  const classes = sortClassesByGrade(classesRaw);

  const typeColor: Record<string, string> = {
    UNIT_TEST: "bg-blue-100 text-blue-700",
    MID_TERM:  "bg-yellow-100 text-yellow-700",
    FINAL:     "bg-red-100 text-red-700",
    PRACTICAL: "bg-purple-100 text-purple-700",
    INTERNAL:  "bg-cyan-100 text-cyan-700",
    EXTERNAL:  "bg-indigo-100 text-indigo-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-sm text-gray-500 mt-1">{exams.length} exams</p>
        </div>
        <CreateExamDialog classes={classes} />
      </div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />All Exams</CardTitle></CardHeader>
        <CardContent className="p-0">
          {exams.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No exams scheduled.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Class</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Period</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Subjects</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exams.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{e.name}</td>
                    <td className="px-6 py-3 text-gray-600">{e.class.name}</td>
                    <td className="px-6 py-3"><Badge className={typeColor[e.examType] ?? "bg-gray-100 text-gray-600"}>{e.examType.replace("_", " ")}</Badge></td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {e.startDate ? new Date(e.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                      {e.endDate ? ` – ${new Date(e.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700">{e._count.schedules}</td>
                    <td className="px-6 py-3 text-right">
                      <ExamRowActions exam={{ id: e.id, name: e.name }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
