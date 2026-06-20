import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users } from "lucide-react";
import { sortClassesByGrade } from "@/lib/class-order";

export default async function ClassesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const classesRaw = await prisma.class.findMany({
    where: { schoolId },
    include: {
      sections: { include: { _count: { select: { students: true } } } },
      _count: { select: { students: true } },
    },
  });
  const classes = sortClassesByGrade(classesRaw);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="text-sm text-gray-500 mt-1">{classes.length} classes configured</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.length === 0 ? (
          <Card className="border-0 shadow-sm col-span-full">
            <CardContent className="py-12 text-center text-sm text-gray-400">No classes found.</CardContent>
          </Card>
        ) : classes.map((cls) => (
          <Card key={cls.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> {cls.name}
                </CardTitle>
                <Badge className="bg-indigo-100 text-indigo-700">
                  <Users className="w-3 h-3 mr-1" />{cls._count.students}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {cls.sections.length === 0 ? (
                <p className="text-xs text-gray-400">No sections</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cls.sections.map((sec) => (
                    <div key={sec.id} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                      Section {sec.name} · {sec._count.students} students
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
