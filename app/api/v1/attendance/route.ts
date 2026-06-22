import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const markSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "HOLIDAY"]),
    remarks: z.string().optional(),
  })).min(1, "At least one student record is required"),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const date = searchParams.get("date");
  if (!classId || !date) return badRequest("classId and date are required");

  try {
    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);

    const students = await prisma.student.findMany({
      where: {
        schoolId: user.schoolId,
        classId,
        isAlumni: false,
        ...(sectionId && { sectionId }),
      },
      select: {
        id: true, firstName: true, middleName: true, lastName: true, rollNumber: true,
        attendance: { where: { date: day }, select: { status: true, remarks: true } },
      },
      orderBy: { rollNumber: "asc" },
    });

    const data = students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      middleName: s.middleName,
      lastName: s.lastName,
      rollNumber: s.rollNumber,
      status: s.attendance[0]?.status ?? "PRESENT",
      remarks: s.attendance[0]?.remarks ?? "",
    }));

    return ok(data);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const schoolId = user.schoolId;
  if (!schoolId) return badRequest("School is required");

  try {
    const body = await req.json();
    const parsed = markSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const data = parsed.data;

    const day = new Date(data.date);
    day.setUTCHours(0, 0, 0, 0);

    const academicYear = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });

    await prisma.$transaction(
      data.records.map((r) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: r.studentId, date: day } },
          update: { status: r.status, remarks: r.remarks || null },
          create: {
            schoolId,
            studentId: r.studentId,
            academicYearId: academicYear?.id,
            date: day,
            status: r.status,
            remarks: r.remarks || null,
          },
        })
      )
    );

    return ok({ marked: data.records.length });
  } catch (e) {
    return serverError(e);
  }
}
