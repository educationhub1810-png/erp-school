import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  schoolId: z.string().optional(),
  // Personal
  firstName: z.string().min(1, "First name required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().optional(),
  bloodGroup: z.string().optional(),
  category: z.string().optional(),
  religion: z.string().optional(),
  aadhaar: z.string().optional(),
  // Contact
  email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().optional(),
  address: z.string().optional(),
  // Academic
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  rollNumber: z.string().optional(),
  admissionNumber: z.string().min(1, "Admission number required"),
  admissionDate: z.string().optional(),
  house: z.string().optional(),
  previousSchool: z.string().optional(),
  // Options
  transportRequired: z.boolean().default(false),
  hostelRequired: z.boolean().default(false),
  medicalNotes: z.string().optional(),
  // Parent
  fatherName: z.string().optional(),
  fatherMobile: z.string().optional(),
  fatherEmail: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherName: z.string().optional(),
  motherMobile: z.string().optional(),
  motherEmail: z.string().optional(),
  motherOccupation: z.string().optional(),
  guardianName: z.string().optional(),
  guardianMobile: z.string().optional(),
  guardianRelation: z.string().optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const schoolId = user.role === "SUPER_ADMIN" ? (searchParams.get("schoolId") || undefined) : user.schoolId;
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  try {
    const where = {
      schoolId: schoolId ?? undefined,
      isAlumni: false,
      ...(classId && { classId }),
      ...(sectionId && { sectionId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { admissionNumber: { contains: search, mode: "insensitive" as const } },
          { rollNumber: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          school: { select: { name: true, code: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
          user: { select: { email: true, mobile: true, isActive: true } },
        },
        orderBy: { admissionDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    return ok({ students, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
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

    const cls = await prisma.class.findFirst({ where: { id: data.classId, schoolId } });
    if (!cls) return badRequest("Selected class does not belong to the chosen school");

    // Check admission number uniqueness
    const existing = await prisma.student.findFirst({
      where: { schoolId, admissionNumber: data.admissionNumber },
    });
    if (existing) return badRequest("Admission number already exists");

    // Create user account for student
    const email = data.email || null;
    const mobile = data.mobile || null;
    const password = await bcrypt.hash("Student@123", 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          name: `${data.firstName} ${data.lastName}`,
          email,
          mobile,
          passwordHash: password,
          role: "STUDENT",
          isActive: true,
          createdBy: session!.user.id,
        },
      });

      const student = await tx.student.create({
        data: {
          schoolId,
          userId: user.id,
          admissionNumber: data.admissionNumber,
          rollNumber: data.rollNumber || null,
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          gender: data.gender,
          dob: data.dob ? new Date(data.dob) : null,
          bloodGroup: data.bloodGroup || null,
          category: data.category || null,
          religion: data.religion || null,
          aadhaar: data.aadhaar || null,
          classId: data.classId,
          sectionId: data.sectionId || null,
          house: data.house || null,
          previousSchool: data.previousSchool || null,
          admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
          transportRequired: data.transportRequired,
          hostelRequired: data.hostelRequired,
          medicalNotes: data.medicalNotes || null,
        },
      });

      // Create parent record if any parent info provided
      const hasParentInfo = data.fatherName || data.motherName || data.guardianName;
      if (hasParentInfo) {
        await tx.parent.create({
          data: {
            schoolId,
            studentId: student.id,
            fatherName: data.fatherName || null,
            fatherMobile: data.fatherMobile || null,
            fatherEmail: data.fatherEmail || null,
            fatherOccupation: data.fatherOccupation || null,
            motherName: data.motherName || null,
            motherMobile: data.motherMobile || null,
            motherEmail: data.motherEmail || null,
            motherOccupation: data.motherOccupation || null,
            guardianName: data.guardianName || null,
            guardianMobile: data.guardianMobile || null,
            guardianRelation: data.guardianRelation || null,
          },
        });
      }

      return student;
    });

    return created(result);
  } catch (e) {
    return serverError(e);
  }
}
