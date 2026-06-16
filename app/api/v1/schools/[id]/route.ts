import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { revalidatePath } from "next/cache";
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
  const user = getUser(session!);

  // SCHOOL_ADMIN can only view their own school
  if (user.role === "SCHOOL_ADMIN" && user.schoolId !== id) return forbidden();

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
  const user = getUser(session!);

  // SCHOOL_ADMIN can only update their own school; cannot change isActive
  if (user.role === "SCHOOL_ADMIN") {
    if (user.schoolId !== id) return forbidden();
  }

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    // Only SUPER_ADMIN can enable/disable schools
    const data = user.role === "SCHOOL_ADMIN"
      ? { ...parsed.data, isActive: undefined }
      : parsed.data;

    const school = await prisma.school.update({
      where: { id },
      data: { ...data, email: data.email || null },
    });
    revalidatePath("/super-admin/schools");
    return ok(school);
  } catch (e) {
    return serverError(e);
  }
}
