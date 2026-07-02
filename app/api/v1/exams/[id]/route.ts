import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        schedules: { include: { subject: { select: { name: true } } } },
        class: { include: { subjects: { select: { id: true, name: true, totalMarks: true, passMarks: true } } } },
      },
    });
    if (!exam) return notFound("Exam not found");
    if (exam.schoolId !== user.schoolId) return forbidden();

    return ok(exam);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return notFound("Exam not found");
    if (exam.schoolId !== user.schoolId) return forbidden();

    await prisma.exam.delete({ where: { id } });
    return ok({ deleted: true, name: exam.name });
  } catch (e) {
    return serverError(e);
  }
}
