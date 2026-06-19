import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { GraduationCap } from "lucide-react";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function StudentResultsPage({ searchParams }: Props) {
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

  // Paginate by exam (20 exams per page), not by individual subject-result row
  const distinctExamIds = await prisma.examResult.findMany({
    where: { studentId },
    select: { examId: true },
    distinct: ["examId"],
    orderBy: { examId: "asc" },
  });
  const totalExams = distinctExamIds.length;
  const totalPages = Math.ceil(totalExams / limit);
  const pageExamIds = distinctExamIds.slice(skip, skip + limit).map((e) => e.examId);

  const results = pageExamIds.length ? await prisma.examResult.findMany({
    where: { studentId, examId: { in: pageExamIds } },
    include: {
      examSchedule: {
        include: {
          exam: { select: { name: true, examType: true } },
          subject: { select: { name: true } },
        },
      },
    },
    orderBy: { examId: "asc" },
  }) : [];

  const byExam = results.reduce((acc, r) => {
    const key = r.examSchedule?.exam?.name ?? "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {} as Record<string, typeof results>);

  const gradeColor = (grade?: string | null) => {
    if (!grade) return "bg-gray-100 text-gray-500";
    if (["A+", "A"].includes(grade)) return "bg-green-100 text-green-700";
    if (["B+", "B"].includes(grade)) return "bg-blue-100 text-blue-700";
    if (["C+", "C"].includes(grade)) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
        <p className="text-sm text-gray-500 mt-1">{totalExams} exam{totalExams !== 1 ? "s" : ""} with published results</p>
      </div>

      {totalExams === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-400">No results published yet.</CardContent>
        </Card>
      ) : (
        Object.entries(byExam).map(([exam, rows]) => {
          const total = rows.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
          const max   = rows.reduce((s, r) => s + (r.examSchedule?.totalMarks ?? 0), 0);
          const pct   = max > 0 ? Math.round((total / max) * 100) : 0;

          return (
            <Card key={exam} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-500" /> {exam}
                  </CardTitle>
                  <span className="text-sm font-semibold text-gray-700">{total}/{max} ({pct}%)</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-6 py-2.5 font-medium text-gray-500">Subject</th>
                      <th className="text-right px-6 py-2.5 font-medium text-gray-500">Marks</th>
                      <th className="text-left px-6 py-2.5 font-medium text-gray-500">Grade</th>
                      <th className="text-left px-6 py-2.5 font-medium text-gray-500">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-6 py-2.5 font-medium text-gray-900">{r.examSchedule?.subject?.name}</td>
                        <td className="px-6 py-2.5 text-right text-gray-700">{r.marksObtained ?? "—"} / {r.examSchedule?.totalMarks ?? "—"}</td>
                        <td className="px-6 py-2.5">
                          <Badge className={gradeColor(r.grade)}>{r.grade ?? "—"}</Badge>
                        </td>
                        <td className="px-6 py-2.5 text-gray-500 text-xs">{r.remarks ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })
      )}

      <Pagination page={page} totalPages={totalPages} total={totalExams} limit={limit} skip={skip} />
    </div>
  );
}
