import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { seedDefaultClasses } from "@/lib/default-classes";
import { revalidatePath } from "next/cache";
import { optionalTextField, emailField, mobileField, addressField, FIELD_MAX } from "@/lib/field-validation";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(2, "School name is too short").max(FIELD_MAX.name, "School name is too long"),
  email: emailField(),
  phone: mobileField(),
  principalName: optionalTextField("Principal name"),
  establishedDate: z.string().optional().or(z.literal("")),
  address: addressField(),
  city: optionalTextField("City"),
  state: z.string().optional(),
  country: z.string().default("India"),
  timezone: z.string().default("Asia/Kolkata"),
  currency: z.string().default("INR"),
  language: z.string().default("en"),
  logo: z.string().optional(),
});

export async function GET() {
  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  try {
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { students: true, teachers: true, users: true } },
      },
    });
    return ok(schools);
  } catch (e) {
    return serverError(e);
  }
}

async function generateSchoolCode(): Promise<string> {
  const schools = await prisma.school.findMany({
    where: { code: { startsWith: "SCH" } },
    select: { code: true },
  });
  const lastNumber = schools.reduce((max, s) => {
    const match = s.code.match(/^SCH(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `SCH${String(lastNumber + 1).padStart(5, "0")}`;
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;

    let code = await generateSchoolCode();
    let school;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        school = await prisma.school.create({
          data: {
            ...data,
            code,
            email: data.email || null,
            logo: data.logo || null,
            establishedDate: data.establishedDate ? new Date(data.establishedDate) : null,
          },
        });
        break;
      } catch (e) {
        const isDuplicateCode = (e as { code?: string })?.code === "P2002" && attempt < 4;
        if (!isDuplicateCode) throw e;
        const nextNumber = parseInt(code.replace("SCH", ""), 10) + 1;
        code = `SCH${String(nextNumber).padStart(5, "0")}`;
      }
    }

    if (school) {
      await seedDefaultClasses(school.id);

      await writeAuditLog({
        action: "SCHOOL_CREATE",
        actorId: session!.user.id,
        actorRole: session!.user.role,
        schoolId: school.id,
        targetType: "school",
        targetId: school.id,
        metadata: { name: school.name, code: school.code },
        ip: clientIp(req),
      });
    }

    revalidatePath("/super-admin/schools");
    return created(school);
  } catch (e) {
    return serverError(e);
  }
}
