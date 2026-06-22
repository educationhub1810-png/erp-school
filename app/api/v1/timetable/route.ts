import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  subjectId: z.string().min(1, "Subject is required"),
  teacherId: z.string().optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  if (!classId) return badRequest("classId is required");

  try {
    const slots = await prisma.timetable.findMany({
      where: {
        schoolId: user.schoolId,
        classId,
        ...(sectionId && { sectionId }),
      },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { user: { select: { name: true } } } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return ok(slots);
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

    const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, schoolId } });
    if (!subject) return badRequest("Please enter correct value (Subject)");

    const slot = await prisma.timetable.create({
      data: {
        schoolId,
        classId: data.classId,
        sectionId: data.sectionId || null,
        subjectId: data.subjectId,
        teacherId: data.teacherId || subject.teacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { user: { select: { name: true } } } },
      },
    });
    return created(slot);
  } catch (e) {
    return serverError(e);
  }
}
