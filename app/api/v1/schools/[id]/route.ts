import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  principalName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
  isActive: z.boolean().optional(),
  logo: z.string().optional(),
  regNumber: z.string().optional(),
  affiliationNumber: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;

  try {
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        academicYears: { orderBy: { startDate: "desc" } },
        _count: { select: { students: true, teachers: true, staff: true, classes: true } },
      },
    });
    if (!school) return notFound("School not found");
    return ok(school);
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const school = await prisma.school.update({
      where: { id },
      data: { ...parsed.data, email: parsed.data.email || null },
    });
    return ok(school);
  } catch (e) {
    return serverError(e);
  }
}
