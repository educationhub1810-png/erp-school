import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const saveSchema = z.object({
  scheduleId: z.string().min(1),
  results: z.array(z.object({
    studentId: z.string().min(1),
    marksObtained: z.coerce.number().min(0).optional(),
    isAbsent: z.boolean().optional(),
    remarks: z.string().optional(),
  })).min(1),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get("scheduleId");
  if (!scheduleId) return badRequest("scheduleId is required");

  try {
    const exam = await prisma.exam.findUnique({ where: { id }, include: { class: true } });
    if (!exam) return notFound("Exam not found");
    if (exam.schoolId !== user.schoolId) return forbidden();

    const students = await prisma.student.findMany({
      where: { classId: exam.classId, isAlumni: false },
      select: {
        id: true, firstName: true, lastName: true, rollNumber: true,
        examResults: { where: { examScheduleId: scheduleId }, select: { marksObtained: true, isAbsent: true, remarks: true } },
      },
      orderBy: { rollNumber: "asc" },
    });

    const data = students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      rollNumber: s.rollNumber,
      marksObtained: s.examResults[0]?.marksObtained ?? null,
      isAbsent: s.examResults[0]?.isAbsent ?? false,
      remarks: s.examResults[0]?.remarks ?? "",
    }));

    return ok(data);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return notFound("Exam not found");
    if (exam.schoolId !== user.schoolId) return forbidden();

    const body = await req.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const data = parsed.data;

    await prisma.$transaction(
      data.results.map((r) =>
        prisma.examResult.upsert({
          where: { examScheduleId_studentId: { examScheduleId: data.scheduleId, studentId: r.studentId } },
          update: {
            marksObtained: r.isAbsent ? null : r.marksObtained,
            isAbsent: r.isAbsent ?? false,
            remarks: r.remarks || null,
          },
          create: {
            schoolId: exam.schoolId,
            examId: exam.id,
            examScheduleId: data.scheduleId,
            studentId: r.studentId,
            marksObtained: r.isAbsent ? null : r.marksObtained,
            isAbsent: r.isAbsent ?? false,
            remarks: r.remarks || null,
          },
        })
      )
    );

    return ok({ saved: data.results.length });
  } catch (e) {
    return serverError(e);
  }
}
