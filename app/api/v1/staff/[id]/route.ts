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
  department: optionalTextField("Department"),
  designation: optionalTextField("Designation"),
  joiningDate: z.string().optional(),
  salary: moneyField("Salary"),
  pan: panField(),
  aadhaar: aadhaarField(),
  bankName: optionalTextField("Bank name"),
  accountNumber: accountNumberField(),
  ifscCode: ifscField(),
  isActive: z.boolean().optional(),
  qualification: optionalTextField("Qualification"),
  experienceYears: positiveIntField("Experience (years)", { max: 60 }),
  licenseNumber: optionalTextField("License number"),
  vehicleNumber: optionalTextField("Vehicle number"),
  assignedBlock: optionalTextField("Assigned block"),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const staff = await prisma.staff.findUnique({ where: { id }, include: { user: { select: { isActive: true } } } });
    if (!staff) return notFound("Staff record not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== staff.schoolId) return forbidden();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.staff.update({
        where: { id },
        data: {
          department: data.department,
          designation: data.designation,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
          salary: data.salary,
          pan: data.pan,
          aadhaar: data.aadhaar,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          qualification: data.qualification,
          experienceYears: data.experienceYears,
          licenseNumber: data.licenseNumber,
          vehicleNumber: data.vehicleNumber,
          assignedBlock: data.assignedBlock,
        },
      });

      if (data.name !== undefined || data.email !== undefined || data.mobile !== undefined || data.isActive !== undefined) {
        await tx.user.update({
          where: { id: staff.userId },
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
      prev: staff.user.isActive,
      next: data.isActive,
      actor: { id: user.id, role: user.role },
      targetUserId: staff.userId,
      targetType: "staff",
      schoolId: staff.schoolId,
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
    const staff = await prisma.staff.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
    if (!staff) return notFound("Staff record not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== staff.schoolId) return forbidden();

    await prisma.user.delete({ where: { id: staff.userId } });

    await writeAuditLog({
      action: "STAFF_DELETE",
      actorId: user.id,
      actorRole: user.role,
      schoolId: staff.schoolId,
      targetType: "staff",
      targetId: staff.id,
      ip: clientIp(req),
    });

    return ok({ deleted: true, name: staff.user.name });
  } catch (e) {
    return serverError(e);
  }
}
