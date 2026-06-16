import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dob: z.string().optional(),
  qualification: z.string().optional(),
  experienceYears: z.number().int().optional(),
  specialization: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: z.number().optional(),
  employeeId: z.string().min(1, "Employee ID required"),
  pan: z.string().optional(),
  aadhaar: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { searchParams } = new URL(req.url);
  const schoolId = session!.user.schoolId;
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

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const schoolId = session!.user.schoolId;
  if (!schoolId) return forbidden();

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;

    // Check employee ID uniqueness
    const existing = await prisma.teacher.findFirst({ where: { schoolId, employeeId: data.employeeId } });
    if (existing) return badRequest("Employee ID already exists");

    const password = await bcrypt.hash("Teacher@123", 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          name: data.name,
          email: data.email || null,
          mobile: data.mobile || null,
          passwordHash: password,
          role: "TEACHER",
          isActive: true,
          createdBy: session!.user.id,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          schoolId,
          userId: user.id,
          employeeId: data.employeeId,
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

      return { ...teacher, user };
    });

    return created(result);
  } catch (e) {
    return serverError(e);
  }
}
