import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  parentType: z.enum(["FATHER", "MOTHER", "GUARDIAN"]).optional(),
  firstName: z.string().min(1).optional(),
  middleName: z.string().optional(),
  lastName: z.string().min(1).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dob: z.string().optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  nationality: z.string().optional(),
  aadhaar: z.string().optional(),
  pan: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const parent = await prisma.user.findUnique({ where: { id } });
    if (!parent || parent.role !== "PARENT") return notFound("Parent account not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== parent.schoolId) return forbidden();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;
    const name = data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined;

    const profileData = {
      parentType: data.parentType,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      gender: data.gender,
      dob: data.dob ? new Date(data.dob) : undefined,
      maritalStatus: data.maritalStatus,
      nationality: data.nationality,
      aadhaar: data.aadhaar,
      pan: data.pan,
      address: data.address,
    };
    const hasProfileChanges = Object.values(profileData).some((v) => v !== undefined);
    const profile = hasProfileChanges
      ? await prisma.parentProfile.findUnique({ where: { userId: id } })
      : null;
    if (hasProfileChanges && !profile) return badRequest("This parent account has no profile to update");

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name,
        email: data.email || undefined,
        mobile: data.mobile,
        isActive: data.isActive,
        ...(hasProfileChanges && { parentProfile: { update: profileData } }),
      },
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const parent = await prisma.user.findUnique({ where: { id } });
    if (!parent || parent.role !== "PARENT") return notFound("Parent account not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== parent.schoolId) return forbidden();

    await prisma.user.delete({ where: { id } });

    return ok({ deleted: true, name: parent.name });
  } catch (e) {
    return serverError(e);
  }
}
