import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dob: z.string().optional(),
  qualification: z.string().optional(),
  experienceYears: z.coerce.number().int().optional(),
  specialization: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: z.coerce.number().optional(),
  pan: z.string().optional(),
  aadhaar: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) return notFound("Teacher not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== teacher.schoolId) return forbidden();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.teacher.update({
        where: { id },
        data: {
          gender: data.gender,
          dob: data.dob ? new Date(data.dob) : undefined,
          qualification: data.qualification,
          experienceYears: data.experienceYears,
          specialization: data.specialization,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
          salary: data.salary,
          pan: data.pan,
          aadhaar: data.aadhaar,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
        },
      });

      if (data.name !== undefined || data.email !== undefined || data.mobile !== undefined || data.isActive !== undefined) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            name: data.name,
            email: data.email || undefined,
            mobile: data.mobile,
            isActive: data.isActive,
          },
        });
      }

      return result;
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
    if (!teacher) return notFound("Teacher not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== teacher.schoolId) return forbidden();

    await prisma.user.delete({ where: { id: teacher.userId } });

    return ok({ deleted: true, name: teacher.user.name });
  } catch (e) {
    return serverError(e);
  }
}
