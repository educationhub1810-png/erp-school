import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id: examId } = await params;
  const user = getUser(session!);

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const { subjectId } = parsed.data;

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return badRequest("Exam not found");
    if (exam.schoolId !== user.schoolId) return forbidden();

    const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId: user.schoolId! } });
    if (!subject) return badRequest("Subject not found");

    const existing = await prisma.examSchedule.findFirst({ where: { examId, subjectId } });
    if (existing) return ok(existing);

    const schedule = await prisma.examSchedule.create({
      data: {
        examId,
        subjectId,
        totalMarks: subject.totalMarks,
        passMarks: subject.passMarks ?? Math.round(subject.totalMarks * 0.33),
      },
      include: { subject: { select: { name: true } } },
    });

    return created(schedule);
  } catch (e) {
    return serverError(e);
  }
}
