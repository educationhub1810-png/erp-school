import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { imageDataUrl } from "@/lib/validation";
import { nameField, optionalTextField, optionalLongTextField, emailField, mobileField, aadhaarField } from "@/lib/field-validation";
import { writeAuditLog, auditAccountStatusChange, clientIp } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  firstName: nameField("First name").optional(),
  middleName: optionalTextField("Middle name"),
  lastName: nameField("Last name").optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dob: z.string().optional(),
  bloodGroup: z.string().optional(),
  category: z.string().optional(),
  religion: z.string().optional(),
  aadhaar: aadhaarField(),
  photoUrl: imageDataUrl(2_000_000),
  classId: z.string().min(1).optional(),
  sectionId: z.string().optional(),
  rollNumber: optionalTextField("Roll number"),
  house: z.string().optional(),
  previousSchool: optionalTextField("Previous school"),
  transportRequired: z.boolean().optional(),
  hostelRequired: z.boolean().optional(),
  medicalNotes: optionalLongTextField("Medical notes"),
  email: emailField(),
  mobile: mobileField(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const student = await prisma.student.findUnique({ where: { id }, include: { user: { select: { isActive: true } } } });
    if (!student) return notFound("Student not found");
    if (user.role === "SCHOOL_ADMIN" && user.schoolId !== student.schoolId) return forbidden();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;

    if (data.classId) {
      const cls = await prisma.class.findFirst({ where: { id: data.classId, schoolId: student.schoolId } });
      if (!cls) return badRequest("Selected class does not belong to this student's school");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.student.update({
        where: { id },
        data: {
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          gender: data.gender,
          dob: data.dob ? new Date(data.dob) : undefined,
          bloodGroup: data.bloodGroup,
          category: data.category,
          religion: data.religion,
          aadhaar: data.aadhaar,
          photoUrl: data.photoUrl !== undefined ? (data.photoUrl || null) : undefined,
          classId: data.classId,
          sectionId: data.sectionId,
          rollNumber: data.rollNumber,
          house: data.house,
          previousSchool: data.previousSchool,
          transportRequired: data.transportRequired,
          hostelRequired: data.hostelRequired,
          medicalNotes: data.medicalNotes,
        },
      });

      if (data.email !== undefined || data.mobile !== undefined || data.isActive !== undefined) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            email: data.email || undefined,
            mobile: data.mobile,
            isActive: data.isActive,
          },
        });
      }

      return result;
    });

    await auditAccountStatusChange({
      prev: student.user.isActive,
      next: data.isActive,
      actor: { id: user.id, role: user.role },
      targetUserId: student.userId,
      targetType: "student",
      schoolId: student.schoolId,
      ip: clientIp(req),
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const student = await prisma.student.findUnique({ where: { id }, select: { id: true, userId: true, schoolId: true, firstName: true, lastName: true } });
    if (!student) return notFound("Student not found");
    if (user.role === "SCHOOL_ADMIN" && user.schoolId !== student.schoolId) return forbidden();

    // Deleting the linked User cascades the Student (and Parent) records.
    await prisma.user.delete({ where: { id: student.userId } });

    await writeAuditLog({
      action: "STUDENT_DELETE",
      actorId: user.id,
      actorRole: user.role,
      schoolId: student.schoolId,
      targetType: "student",
      targetId: student.id,
      ip: clientIp(req),
    });

    return ok({ deleted: true, name: `${student.firstName} ${student.lastName}` });
  } catch (e) {
    return serverError(e);
  }
}
