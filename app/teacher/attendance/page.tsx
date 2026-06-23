import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { sortClassesByGrade } from "@/lib/class-order";
import { AttendanceMarker } from "@/components/shared/attendance-marker";

export default async function TeacherAttendancePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const classesRaw = await prisma.class.findMany({
    where: { schoolId },
    include: { sections: { select: { id: true, name: true } } },
  });
  const classes = sortClassesByGrade(classesRaw);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Mark daily attendance for your class</p>
      </div>
      <AttendanceMarker classes={classes} />
    </div>
  );
}
