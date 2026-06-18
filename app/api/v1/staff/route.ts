import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";
import bcrypt from "bcryptjs";

const STAFF_ROLES = ["PRINCIPAL", "ACCOUNTANT", "LIBRARIAN", "TRANSPORT_MANAGER", "HR_MANAGER", "WARDEN_MANAGER"] as const;

const createSchema = z.object({
  schoolId: z.string().optional(),
  role: z.enum(STAFF_ROLES),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: z.coerce.number().optional(),
  pan: z.string().optional(),
  aadhaar: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  qualification: z.string().optional(),
  experienceYears: z.coerce.number().int().optional(),
  licenseNumber: z.string().optional(),
  vehicleNumber: z.string().optional(),
  assignedBlock: z.string().optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  if (!role || !STAFF_ROLES.includes(role as typeof STAFF_ROLES[number])) {
    return badRequest("A valid staff role is required");
  }
  const schoolId = user.role === "SUPER_ADMIN" ? (searchParams.get("schoolId") || undefined) : user.schoolId;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  try {
    const where = {
      schoolId: schoolId ?? undefined,
      user: {
        role: role as typeof STAFF_ROLES[number],
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      },
    };

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        include: {
          school: { select: { name: true, code: true } },
          user: { select: { name: true, email: true, mobile: true, isActive: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ]);

    return ok({ staff, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
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

    const existing = await prisma.staff.findFirst({ where: { schoolId, employeeId: data.employeeId } });
    if (existing) return badRequest("Employee ID already exists");

    const password = await bcrypt.hash("Staff@123", 12);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          schoolId,
          name: data.name,
          email: data.email || null,
          mobile: data.mobile || null,
          passwordHash: password,
          role: data.role,
          isActive: true,
          createdBy: user.id,
        },
      });

      const staff = await tx.staff.create({
        data: {
          schoolId,
          userId: newUser.id,
          employeeId: data.employeeId,
          department: data.department || null,
          designation: data.designation || null,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
          salary: data.salary ?? null,
          pan: data.pan || null,
          aadhaar: data.aadhaar || null,
          bankName: data.bankName || null,
          accountNumber: data.accountNumber || null,
          ifscCode: data.ifscCode || null,
          qualification: data.qualification || null,
          experienceYears: data.experienceYears ?? null,
          licenseNumber: data.licenseNumber || null,
          vehicleNumber: data.vehicleNumber || null,
          assignedBlock: data.assignedBlock || null,
        },
      });

      return { ...staff, user: newUser };
    });

    return created(result);
  } catch (e) {
    return serverError(e);
  }
}
