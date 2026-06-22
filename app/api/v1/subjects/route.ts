import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError, duplicateValue } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
  totalMarks: z.coerce.number().int().optional(),
  passMarks: z.coerce.number().int().optional(),
  teacherId: z.string().optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const schoolId = user.role === "SUPER_ADMIN" ? (searchParams.get("schoolId") || undefined) : user.schoolId;
  const classId = searchParams.get("classId");

  try {
    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId ?? undefined, ...(classId && { classId }) },
      include: {
        class: { select: { name: true } },
        teacher: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
    });
    return ok(subjects);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN"]);
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

    const cls = await prisma.class.findFirst({ where: { id: data.classId, schoolId } });
    if (!cls) return badRequest("Please enter correct value (Class)");

    if (data.teacherId) {
      const teacher = await prisma.teacher.findFirst({ where: { id: data.teacherId, schoolId } });
      if (!teacher) return badRequest("Please enter correct value (Teacher)");
    }

    const subject = await prisma.subject.create({
      data: {
        schoolId,
        classId: data.classId,
        name: data.name,
        code: data.code || null,
        totalMarks: data.totalMarks ?? 100,
        passMarks: data.passMarks ?? null,
        teacherId: data.teacherId || null,
      },
      include: {
        class: { select: { name: true } },
        teacher: { select: { id: true, user: { select: { name: true } } } },
      },
    });
    return created(subject);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") {
      return duplicateValue(e);
    }
    return serverError(e);
  }
}
