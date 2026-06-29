import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { writeAuditLog, auditAccountStatusChange, clientIp } from "@/lib/audit";
import { z } from "zod";
import {
  nameField, emailField, mobileField, aadhaarField, panField, ifscField,
  accountNumberField, moneyField, positiveIntField, optionalTextField,
} from "@/lib/field-validation";

const updateSchema = z.object({
  name: nameField().optional(),
  email: emailField(),
  mobile: mobileField(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dob: z.string().optional(),
  qualification: optionalTextField("Qualification"),
  experienceYears: positiveIntField("Experience (years)", { max: 60 }),
  specialization: optionalTextField("Specialization"),
  joiningDate: z.string().optional(),
  salary: moneyField("Salary"),
  pan: panField(),
  aadhaar: aadhaarField(),
  bankName: optionalTextField("Bank name"),
  accountNumber: accountNumberField(),
  ifscCode: ifscField(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: { select: { isActive: true } } } });
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

    await auditAccountStatusChange({
      prev: teacher.user.isActive,
      next: data.isActive,
      actor: { id: user.id, role: user.role },
      targetUserId: teacher.userId,
      targetType: "teacher",
      schoolId: teacher.schoolId,
      ip: clientIp(req),
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    await writeAuditLog({
      action: "TEACHER_DELETE",
      actorId: user.id,
      actorRole: user.role,
      schoolId: teacher.schoolId,
      targetType: "teacher",
      targetId: teacher.id,
      ip: clientIp(req),
    });

    return ok({ deleted: true, name: teacher.user.name });
  } catch (e) {
    return serverError(e);
  }
}
