import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError, duplicateValue } from "@/lib/api-response";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  nameField, emailField, mobileField, aadhaarField, panField, ifscField,
  accountNumberField, moneyField, positiveIntField, optionalTextField,
} from "@/lib/field-validation";

const createSchema = z.object({
  schoolId: z.string().optional(),
  name: nameField(),
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
}).superRefine((data, ctx) => {
  if (!data.dob) ctx.addIssue({ code: "custom", message: "Date of birth is required", path: ["dob"] });
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const schoolId = user.role === "SUPER_ADMIN" ? (searchParams.get("schoolId") || undefined) : user.schoolId;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  try {
    const where = {
      schoolId: schoolId ?? undefined,
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }),
    };

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        include: {
          school: { select: { name: true, code: true } },
          user: { select: { name: true, email: true, mobile: true, isActive: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.teacher.count({ where }),
    ]);

    return ok({ teachers, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

async function generateTeacherCode(schoolId: string): Promise<string> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const letter = (school?.name.trim()[0] || "X").toUpperCase();
  const prefix = `${letter}-TCH`;

  const teachers = await prisma.teacher.findMany({
    where: { employeeId: { startsWith: prefix } },
    select: { employeeId: true },
  });
  const codePattern = new RegExp(`^${letter}-TCH(\\d+)$`);
  const lastNumber = teachers.reduce((max, t) => {
    const match = t.employeeId.match(codePattern);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `${prefix}${String(lastNumber + 1).padStart(5, "0")}`;
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;
    const schoolId = user.role === "SUPER_ADMIN" ? data.schoolId : user.schoolId;
    if (!schoolId) return badRequest("School is required");

    const employeeId = await generateTeacherCode(schoolId);
    const password = await bcrypt.hash("Teacher@123", 12);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          schoolId,
          name: data.name,
          email: data.email || null,
          mobile: data.mobile || null,
          passwordHash: password,
          role: "TEACHER",
          isActive: true,
          createdBy: user.id,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          schoolId,
          userId: newUser.id,
          employeeId,
          gender: data.gender || null,
          dob: data.dob ? new Date(data.dob) : null,
          qualification: data.qualification || null,
          experienceYears: data.experienceYears || null,
          specialization: data.specialization || null,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
          salary: data.salary || null,
          pan: data.pan || null,
          aadhaar: data.aadhaar || null,
          bankName: data.bankName || null,
          accountNumber: data.accountNumber || null,
          ifscCode: data.ifscCode || null,
        },
      });

      return { ...teacher, user: newUser };
    });

    return created(result);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") {
      return duplicateValue(e);
    }
    return serverError(e);
  }
}
