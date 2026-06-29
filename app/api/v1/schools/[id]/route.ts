import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { optionalTextField, emailField, mobileField, addressField, FIELD_MAX } from "@/lib/field-validation";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(2, "School name is too short").max(FIELD_MAX.name, "School name is too long").optional(),
  email: emailField(),
  phone: mobileField(),
  principalName: optionalTextField("Principal name"),
  address: addressField(),
  city: optionalTextField("City"),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
  isActive: z.boolean().optional(),
  logo: z.string().optional(),
  regNumber: optionalTextField("Registration number"),
  affiliationNumber: optionalTextField("Affiliation number"),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

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

  if (user.role === "SCHOOL_ADMIN" && user.schoolId !== id) return forbidden();

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = user.role === "SCHOOL_ADMIN"
      ? { ...parsed.data, isActive: undefined }
      : parsed.data;

    // Capture prior active state to detect an activation/deactivation.
    const prior = data.isActive !== undefined
      ? await prisma.school.findUnique({ where: { id }, select: { isActive: true } })
      : null;

    const school = await prisma.school.update({
      where: { id },
      data: { ...data, email: data.email || null },
    });

    if (prior && data.isActive !== undefined && prior.isActive !== data.isActive) {
      await writeAuditLog({
        action: data.isActive ? "SCHOOL_ACTIVATE" : "SCHOOL_DEACTIVATE",
        actorId: user.id,
        actorRole: user.role,
        schoolId: id,
        targetType: "school",
        targetId: id,
        metadata: { name: school.name, code: school.code },
        ip: clientIp(req),
      });
    }

    revalidatePath("/super-admin/schools");
    return ok(school);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const school = await prisma.school.findUnique({ where: { id }, select: { id: true, name: true, code: true } });
    if (!school) return notFound("School not found");

    await prisma.school.delete({ where: { id } });

    await writeAuditLog({
      action: "SCHOOL_DELETE",
      actorId: user.id,
      actorRole: user.role,
      schoolId: id,
      targetType: "school",
      targetId: id,
      metadata: { name: school.name, code: school.code },
      ip: clientIp(_req),
    });

    revalidatePath("/super-admin/schools");
    return ok({ deleted: true, name: school.name });
  } catch (e) {
    return serverError(e);
  }
}
