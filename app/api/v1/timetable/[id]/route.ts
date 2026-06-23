import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  subjectId: z.string().min(1).optional(),
  teacherId: z.string().optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const slot = await prisma.timetable.findUnique({ where: { id } });
    if (!slot) return notFound("Timetable slot not found");
    if (slot.schoolId !== user.schoolId) return forbidden();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const data = parsed.data;

    if (data.subjectId) {
      const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, schoolId: slot.schoolId } });
      if (!subject) return badRequest("Please enter correct value (Subject)");
    }

    const updated = await prisma.timetable.update({
      where: { id },
      data: {
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { user: { select: { name: true } } } },
      },
    });
    return ok(updated);
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
    const slot = await prisma.timetable.findUnique({ where: { id } });
    if (!slot) return notFound("Timetable slot not found");
    if (slot.schoolId !== user.schoolId) return forbidden();

    await prisma.timetable.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
