import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError, duplicateValue } from "@/lib/api-response";
import { formatDobAsPassword } from "@/lib/utils";
import { z } from "zod";
import bcrypt from "bcryptjs";

const STAFF_ROLES = ["PRINCIPAL", "ACCOUNTANT", "LIBRARIAN", "TRANSPORT_MANAGER", "HR_MANAGER", "WARDEN_MANAGER", "MESS_MANAGER"] as const;

// Principals log in with their date of birth as the password (like
// students); everyone else gets the fixed default password below.
const DOB_PASSWORD_ROLES = ["PRINCIPAL"] as const;

const createSchema = z.object({
  schoolId: z.string().optional(),
  role: z.enum(STAFF_ROLES),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  dob: z.string().optional(),
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

async function generatePrincipalCode(schoolId: string): Promise<string> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const letter = (school?.name.trim()[0] || "X").toUpperCase();
  const prefix = `${letter}-PRN`;

  const principals = await prisma.staff.findMany({
    where: { employeeId: { startsWith: prefix } },
    select: { employeeId: true },
  });
  const codePattern = new RegExp(`^${letter}-PRN(\\d+)$`);
  const lastNumber = principals.reduce((max, p) => {
    const match = p.employeeId.match(codePattern);
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

    let employeeId: string;
    if (data.role === "PRINCIPAL") {
      employeeId = await generatePrincipalCode(schoolId);
    } else {
      if (!data.employeeId) return badRequest("Please enter correct value (Employee ID)");
      const existing = await prisma.staff.findFirst({ where: { schoolId, employeeId: data.employeeId } });
      if (existing) return badRequest("Please enter correct value (Employee ID)");
      employeeId = data.employeeId;
    }

    const usesDobPassword = (DOB_PASSWORD_ROLES as readonly string[]).includes(data.role);
    if (usesDobPassword && !data.dob) return badRequest("Date of birth is required");

    const password = await bcrypt.hash(
      usesDobPassword && data.dob ? formatDobAsPassword(data.dob) : "Staff@123",
      12,
    );

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
          employeeId,
          department: data.department || null,
          designation: data.designation || null,
          dob: data.dob ? new Date(data.dob) : null,
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
    if ((e as { code?: string })?.code === "P2002") {
      return duplicateValue(e);
    }
    return serverError(e);
  }
}
