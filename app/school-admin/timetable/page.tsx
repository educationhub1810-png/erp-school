import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { sortClassesByGrade } from "@/lib/class-order";
import { TimetableGrid } from "@/components/shared/timetable-grid";

export default async function SchoolAdminTimetablePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const [classesRaw, subjects] = await Promise.all([
    prisma.class.findMany({ where: { schoolId }, include: { sections: { select: { id: true, name: true } } } }),
    prisma.subject.findMany({ where: { schoolId }, select: { id: true, name: true, classId: true } }),
  ]);
  const classes = sortClassesByGrade(classesRaw);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-sm text-gray-500 mt-1">Build and manage the class timetable</p>
      </div>
      <TimetableGrid classes={classes} subjects={subjects} />
    </div>
  );
}
