import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError, duplicateValue } from "@/lib/api-response";
import { z } from "zod";
import bcrypt from "bcryptjs";

const personSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  nationality: z.string().optional(),
  aadhaar: z.string().optional(),
  pan: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
});

const createSchema = z.object({
  schoolId: z.string().optional(),
  studentId: z.string().min(1, "Student is required"),
  father: personSchema.optional(),
  mother: personSchema.optional(),
  guardian: personSchema.optional(),
}).refine((data) => data.father || data.mother || data.guardian, {
  message: "Fill in at least one of Father, Mother, or Guardian",
});

const ROLE_MAP = { father: "FATHER", mother: "MOTHER", guardian: "GUARDIAN" } as const;

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
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
      role: "PARENT" as const,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { parentProfile: { parentCode: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const [parents, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, mobile: true, isActive: true, createdAt: true,
          school: { select: { name: true, code: true } },
          parentProfile: {
            select: {
              parentCode: true, parentType: true, firstName: true, middleName: true, lastName: true,
              gender: true, dob: true, maritalStatus: true, nationality: true, aadhaar: true, pan: true, address: true,
              student: { select: { firstName: true, lastName: true, studentCode: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return ok({ parents, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

async function generateParentCode(schoolId: string, taken: Set<string>): Promise<string> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const letter = (school?.name.trim()[0] || "X").toUpperCase();
  const prefix = `${letter}-PAR`;

  const profiles = await prisma.parentProfile.findMany({
    where: { parentCode: { startsWith: prefix } },
    select: { parentCode: true },
  });
  const codePattern = new RegExp(`^${letter}-PAR(\\d+)$`);
  let lastNumber = profiles.reduce((max, p) => {
    const match = p.parentCode.match(codePattern);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  let code = `${prefix}${String(lastNumber + 1).padStart(5, "0")}`;
  while (taken.has(code)) {
    lastNumber += 1;
    code = `${prefix}${String(lastNumber + 1).padStart(5, "0")}`;
  }
  return code;
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
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

    const student = await prisma.student.findFirst({ where: { id: data.studentId, schoolId } });
    if (!student) return badRequest("Selected student does not belong to the chosen school");

    const sections = (["father", "mother", "guardian"] as const)
      .map((role) => ({ role, person: data[role] }))
      .filter((s): s is { role: "father" | "mother" | "guardian"; person: z.infer<typeof personSchema> } => !!s.person);

    const password = await bcrypt.hash("Parent@123", 12);
    const usedCodes = new Set<string>();
    const createdAccounts: { role: string; name: string; parentCode: string; dob: string | null }[] = [];

    const result = await prisma.$transaction(async (tx) => {
      for (const { role, person } of sections) {
        let parentCode = await generateParentCode(schoolId, usedCodes);
        usedCodes.add(parentCode);

        const createdUser = await tx.user.create({
          data: {
            schoolId,
            name: `${person.firstName} ${person.lastName}`,
            email: person.email || null,
            mobile: person.mobile || null,
            passwordHash: password,
            role: "PARENT",
            isActive: true,
            createdBy: user.id,
          },
        });

        await tx.parentProfile.create({
          data: {
            userId: createdUser.id,
            schoolId,
            studentId: data.studentId,
            parentCode,
            parentType: ROLE_MAP[role],
            firstName: person.firstName,
            middleName: person.middleName || null,
            lastName: person.lastName,
            gender: person.gender,
            dob: person.dob ? new Date(person.dob) : null,
            maritalStatus: person.maritalStatus || null,
            nationality: person.nationality || null,
            aadhaar: person.aadhaar || null,
            pan: person.pan || null,
            address: person.address || null,
          },
        });

        createdAccounts.push({ role, name: createdUser.name, parentCode, dob: person.dob || null });
      }
      return createdAccounts;
    });

    return created({ accounts: result });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") {
      return duplicateValue(e);
    }
    return serverError(e);
  }
}
