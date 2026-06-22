import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { sortClassesByGrade } from "@/lib/class-order";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";

export default async function TeacherClassesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const classesRaw = await prisma.class.findMany({
    where: { schoolId },
    include: {
      sections: { select: { id: true, name: true, _count: { select: { students: true } } } },
      subjects: { select: { id: true, name: true, code: true } },
      _count: { select: { students: true } },
    },
  });
  const classes = sortClassesByGrade(classesRaw);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-sm text-gray-500 mt-1">Classes, sections and subjects at your school</p>
      </div>

      {classes.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No classes found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Card key={cls.id} className="border-0 shadow-sm">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                  <span className="text-xs text-gray-400">{cls._count.students} students</span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Sections</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cls.sections.map((s) => (
                      <Badge key={s.id} variant="outline" className="font-normal">
                        {s.name} <span className="text-gray-400 ml-1">({s._count.students})</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Subjects</p>
                  {cls.subjects.length === 0 ? (
                    <p className="text-xs text-gray-400">No subjects added yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {cls.subjects.map((s) => (
                        <Badge key={s.id} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 font-normal">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
