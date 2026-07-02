import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError, duplicateValue } from "@/lib/api-response";
import { imageDataUrl } from "@/lib/validation";
import { nameField, optionalTextField, optionalLongTextField, emailField, mobileField, aadhaarField, addressField, pincodeField } from "@/lib/field-validation";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  schoolId: z.string().optional(),
  // Personal
  firstName: nameField("First name"),
  middleName: optionalTextField("Middle name"),
  lastName: nameField("Last name"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().min(1, "Date of birth is required"),
  bloodGroup: z.string().optional(),
  category: z.string().optional(),
  religion: z.string().optional(),
  aadhaar: aadhaarField(),
  photoUrl: imageDataUrl(2_000_000),
  // Contact
  email: emailField(),
  mobile: mobileField(),
  addressLine1: addressField(),
  addressLine2: optionalTextField("Address line 2"),
  zipCode: pincodeField(),
  city: optionalTextField("City"),
  state: optionalTextField("State"),
  country: optionalTextField("Country"),
  // Academic
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  rollNumber: optionalTextField("Roll number"),
  admissionDate: z.string().optional(),
  house: z.string().optional(),
  previousSchool: optionalTextField("Previous school"),
  // Options
  transportRequired: z.boolean().default(false),
  hostelRequired: z.boolean().default(false),
  medicalNotes: optionalLongTextField("Medical notes"),
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
          { studentCode: { contains: search, mode: "insensitive" as const } },
          { rollNumber: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    // Only privileged roles may see sensitive PII. Teachers get a reduced view.
    // The base64 photoUrl blob is never returned in lists (fetch it per-record).
    const canSeePii = user.role === "SUPER_ADMIN" || user.role === "SCHOOL_ADMIN" || user.role === "PRINCIPAL";
    const select = {
      id: true,
      schoolId: true,
      studentCode: true,
      rollNumber: true,
      firstName: true,
      middleName: true,
      lastName: true,
      gender: true,
      classId: true,
      sectionId: true,
      house: true,
      admissionDate: true,
      isAlumni: true,
      // Sensitive PII — privileged roles only.
      ...(canSeePii && {
        dob: true,
        bloodGroup: true,
        category: true,
        religion: true,
        aadhaar: true,
        medicalNotes: true,
        previousSchool: true,
        addressLine1: true,
        addressLine2: true,
        zipCode: true,
        city: true,
        state: true,
        country: true,
      }),
      school: { select: { name: true, code: true } },
      class: { select: { name: true } },
      section: { select: { name: true } },
      user: { select: { email: true, mobile: true, isActive: true } },
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select,
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

async function generateStudentCode(schoolId: string): Promise<string> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const letter = (school?.name.trim()[0] || "X").toUpperCase();
  const prefix = `${letter}-STD`;

  const students = await prisma.student.findMany({
    where: { studentCode: { startsWith: prefix } },
    select: { studentCode: true },
  });
  const codePattern = new RegExp(`^${letter}-STD(\\d+)$`);
  const lastNumber = students.reduce((max, s) => {
    const match = s.studentCode.match(codePattern);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `${prefix}${String(lastNumber + 1).padStart(5, "0")}`;
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

    // Create user account for student
    const email = data.email || null;
    const mobile = data.mobile || null;
    const password = await bcrypt.hash("Student@123", 12);

    let studentCode = await generateStudentCode(schoolId);

    let result;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        result = await prisma.$transaction(async (tx) => {
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
              studentCode,
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
              photoUrl: data.photoUrl || null,
              classId: data.classId,
              sectionId: data.sectionId || null,
              house: data.house || null,
              previousSchool: data.previousSchool || null,
              admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
              transportRequired: data.transportRequired,
              hostelRequired: data.hostelRequired,
              medicalNotes: data.medicalNotes || null,
              addressLine1: data.addressLine1 || null,
              addressLine2: data.addressLine2 || null,
              zipCode: data.zipCode || null,
              city: data.city || null,
              state: data.state || null,
              country: data.country || null,
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
        break;
      } catch (e) {
        const isDuplicateCode = (e as { code?: string })?.code === "P2002" && attempt < 4;
        if (!isDuplicateCode) throw e;
        const match = studentCode.match(/^([A-Z]-STD)(\d+)$/);
        if (!match) throw e;
        const nextNumber = parseInt(match[2], 10) + 1;
        studentCode = `${match[1]}${String(nextNumber).padStart(5, "0")}`;
      }
    }

    return created(result);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return duplicateValue(e);
    return serverError(e);
  }
}
