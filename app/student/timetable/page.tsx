import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function StudentTimetablePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const student = await prisma.student.findFirst({
    where: { user: { email: session.user.email ?? undefined } },
    include: { class: true, section: true },
  });

  const timetable = student ? await prisma.timetable.findMany({
    where: { classId: student.classId, sectionId: student.sectionId ?? undefined },
    include: { subject: true, teacher: { include: { user: { select: { name: true } } } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  }) : [];

  const byDay = DAYS.reduce((acc, day, i) => {
    acc[day] = timetable.filter((t) => t.dayOfWeek === i + 1);
    return acc;
  }, {} as Record<string, typeof timetable>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-sm text-gray-500 mt-1">
          {student ? `${student.class?.name}${student.section ? " — Section " + student.section.name : ""}` : "Class not assigned"}
        </p>
      </div>

      {DAYS.map((day) => (
        <Card key={day} className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-500" /> {day}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byDay[day].length === 0 ? (
              <p className="text-sm text-gray-400">No classes</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {byDay[day].map((slot) => (
                  <div key={slot.id} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <p className="text-xs text-indigo-400 font-medium">{slot.startTime} – {slot.endTime}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{slot.subject?.name}</p>
                    <p className="text-xs text-gray-500">{slot.teacher?.user?.name ?? "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {timetable.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-400">
            No timetable configured yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
