import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { sortClassesByGrade } from "@/lib/class-order";
import { ensureClassSections, DEFAULT_SECTIONS } from "@/lib/ensure-class-sections";
import { nameField, positiveIntField } from "@/lib/field-validation";
import { z } from "zod";

const createSchema = z.object({
  schoolId: z.string().optional(),
  name: nameField("Class name"),
  capacity: positiveIntField("Capacity", { required: false, max: 500 }),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const schoolId = user.role === "SUPER_ADMIN" ? searchParams.get("schoolId") : user.schoolId;
  if (!schoolId) return badRequest("schoolId is required");

  try {
    let classes = await prisma.class.findMany({
      where: { schoolId },
      include: { sections: true },
    });
    if (await ensureClassSections(classes)) {
      classes = await prisma.class.findMany({
        where: { schoolId },
        include: { sections: true },
      });
    }
    return ok(sortClassesByGrade(classes));
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;
    const schoolId = user.role === "SUPER_ADMIN" ? data.schoolId : user.schoolId;
    if (!schoolId) return badRequest("School is required");

    const cls = await prisma.class.create({
      data: {
        schoolId,
        name: data.name,
        capacity: data.capacity,
      },
    });

    await prisma.section.createMany({
      data: DEFAULT_SECTIONS.map((name) => ({ classId: cls.id, name })),
    });

    const withSections = await prisma.class.findUnique({ where: { id: cls.id }, include: { sections: true } });
    return created(withSections);
  } catch (e) {
    return serverError(e);
  }
}
