import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: z.coerce.number().optional(),
  pan: z.string().optional(),
  aadhaar: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  isActive: z.boolean().optional(),
  qualification: z.string().optional(),
  experienceYears: z.coerce.number().int().optional(),
  licenseNumber: z.string().optional(),
  vehicleNumber: z.string().optional(),
  assignedBlock: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const staff = await prisma.staff.findUnique({ where: { id } });
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
