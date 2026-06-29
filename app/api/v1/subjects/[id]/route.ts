import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { nameField, optionalTextField } from "@/lib/field-validation";
import { z } from "zod";

const updateSchema = z.object({
  classId: z.string().optional(),
  name: nameField("Subject name").optional(),
  code: optionalTextField("Subject code", 20),
  totalMarks: z.coerce.number().int().min(1).max(1000, "Total marks is too large").optional(),
  passMarks: z.coerce.number().int().min(0).max(1000, "Pass marks is too large").optional(),
  teacherId: z.string().nullable().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);
  const schoolId = user.schoolId;
  if (!schoolId) return badRequest("School is required");

  try {
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) return notFound("Subject not found");
    if (subject.schoolId !== schoolId) return forbidden();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const data = parsed.data;

    if (data.classId) {
      const cls = await prisma.class.findFirst({ where: { id: data.classId, schoolId } });
      if (!cls) return badRequest("Please enter correct value (Class)");
    }
    if (data.teacherId) {
      const teacher = await prisma.teacher.findFirst({ where: { id: data.teacherId, schoolId } });
      if (!teacher) return badRequest("Please enter correct value (Teacher)");
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        classId: data.classId,
        name: data.name,
        code: data.code,
        totalMarks: data.totalMarks,
        passMarks: data.passMarks,
        teacherId: data.teacherId === undefined ? undefined : data.teacherId || null,
      },
      include: {
        class: { select: { name: true } },
        teacher: { select: { id: true, user: { select: { name: true } } } },
      },
    });
    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) return notFound("Subject not found");
    if (subject.schoolId !== user.schoolId) return forbidden();

    await prisma.subject.delete({ where: { id } });
    return ok({ deleted: true, name: subject.name });
  } catch (e) {
    return serverError(e);
  }
}
