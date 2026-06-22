import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z.string().min(1, "Exam name is required"),
  examType: z.enum(["UNIT_TEST", "MID_TERM", "FINAL", "PRACTICAL", "INTERNAL", "EXTERNAL"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  try {
    const exams = await prisma.exam.findMany({
      where: { schoolId: user.schoolId, ...(classId && { classId }) },
      include: { class: { select: { name: true } }, _count: { select: { schedules: true } } },
      orderBy: { startDate: "desc" },
    });
    return ok(exams);
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
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const data = parsed.data;

    const cls = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
      include: { subjects: true },
    });
    if (!cls) return badRequest("Please enter correct value (Class)");

    const academicYear = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });

    const exam = await prisma.$transaction(async (tx) => {
      const examRecord = await tx.exam.create({
        data: {
          schoolId,
          academicYearId: academicYear?.id,
          classId: data.classId,
          name: data.name,
          examType: data.examType,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          isPublished: data.isPublished ?? false,
        },
      });

      if (cls.subjects.length > 0) {
        await tx.examSchedule.createMany({
          data: cls.subjects.map((s) => ({
            examId: examRecord.id,
            subjectId: s.id,
            totalMarks: s.totalMarks,
            passMarks: s.passMarks ?? Math.round(s.totalMarks * 0.33),
          })),
        });
      }

      return examRecord;
    });

    return created(exam);
  } catch (e) {
    return serverError(e);
  }
}
