import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  subjectId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  try {
    const homework = await prisma.homework.findMany({
      where: { schoolId: user.schoolId, ...(classId && { classId }) },
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "desc" },
    });
    return ok(homework);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["TEACHER"]);
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

    if (data.subjectId) {
      const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, schoolId } });
      if (!subject) return badRequest("Please enter correct value (Subject)");
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId: user.id }, select: { id: true } });

    const homework = await prisma.homework.create({
      data: {
        schoolId,
        classId: data.classId,
        sectionId: data.sectionId || null,
        subjectId: data.subjectId || null,
        teacherId: teacher?.id,
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        attachmentUrl: data.attachmentUrl || null,
      },
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });
    return created(homework);
  } catch (e) {
    return serverError(e);
  }
}
