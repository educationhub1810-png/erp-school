import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { sortClassesByGrade } from "@/lib/class-order";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateHomeworkDialog } from "./create-homework-dialog";
import { HomeworkRowActions } from "./homework-row-actions";
import { FileText } from "lucide-react";

export default async function TeacherHomeworkPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const [homework, classesRaw, subjects] = await Promise.all([
    prisma.homework.findMany({
      where: { schoolId },
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "desc" },
    }),
    prisma.class.findMany({ where: { schoolId }, include: { sections: { select: { id: true, name: true } } } }),
    prisma.subject.findMany({ where: { schoolId }, select: { id: true, name: true, classId: true } }),
  ]);
  const classes = sortClassesByGrade(classesRaw);

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
          <p className="text-sm text-gray-500 mt-1">{homework.length} assignments</p>
        </div>
        <CreateHomeworkDialog classes={classes} subjects={subjects} />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />All Homework</CardTitle></CardHeader>
        <CardContent className="p-0">
          {homework.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No homework assigned yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Class</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Subject</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Due Date</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Submissions</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {homework.map((hw) => {
                  const overdue = hw.dueDate && hw.dueDate < now;
                  return (
                    <tr key={hw.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{hw.title}</td>
                      <td className="px-6 py-3 text-gray-600">{hw.class.name}{hw.section ? `-${hw.section.name}` : ""}</td>
                      <td className="px-6 py-3 text-gray-500">{hw.subject?.name ?? "—"}</td>
                      <td className="px-6 py-3 text-xs">
                        {hw.dueDate ? (
                          <Badge className={overdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                            {new Date(hw.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-700">{hw._count.submissions}</td>
                      <td className="px-6 py-3 text-right">
                        <HomeworkRowActions homework={{ id: hw.id, title: hw.title }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
