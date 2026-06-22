import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { CreateSubjectDialog } from "./create-subject-dialog";
import { SubjectRowActions } from "./subject-row-actions";
import { sortClassesByGrade } from "@/lib/class-order";

export default async function SubjectsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const [subjects, classesRaw, teachers] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId },
      include: {
        class: { select: { name: true } },
        teacher: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    prisma.teacher.findMany({ where: { schoolId }, select: { id: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  const classes = sortClassesByGrade(classesRaw);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-sm text-gray-500 mt-1">{subjects.length} subjects</p>
        </div>
        <CreateSubjectDialog classes={classes} teachers={teachers} />
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {subjects.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No subjects found. Add one to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Subject</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Code</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Class</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Teacher</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Total Marks</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">{s.code ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{s.class.name}</td>
                    <td className="px-6 py-3 text-gray-600">{s.teacher?.user.name ?? <span className="text-gray-400">Unassigned</span>}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{s.totalMarks}</td>
                    <td className="px-6 py-3 text-right">
                      <SubjectRowActions
                        subject={{ id: s.id, classId: s.classId, name: s.name, code: s.code, totalMarks: s.totalMarks, passMarks: s.passMarks, teacherId: s.teacherId }}
                        classes={classes}
                        teachers={teachers}
                      />
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
