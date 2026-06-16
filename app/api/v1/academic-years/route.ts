import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  isActive: z.boolean().default(false),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const schoolId = session!.user.schoolId;
  try {
    const years = await prisma.academicYear.findMany({
      where: { schoolId: schoolId ?? undefined },
      orderBy: { startDate: "desc" },
    });
    return ok(years);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const schoolId = session!.user.schoolId;
  if (!schoolId) return forbidden();

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;

    // If this year is active, deactivate others
    if (data.isActive) {
      await prisma.academicYear.updateMany({ where: { schoolId }, data: { isActive: false } });
    }

    const year = await prisma.academicYear.create({
      data: {
        schoolId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive,
      },
    });
    return created(year);
  } catch (e) {
    return serverError(e);
  }
}
