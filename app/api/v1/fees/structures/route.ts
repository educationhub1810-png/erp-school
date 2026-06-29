import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { requiredTextField, optionalLongTextField, FIELD_MAX } from "@/lib/field-validation";
import { z } from "zod";

const createSchema = z.object({
  feeType: requiredTextField("Fee type", FIELD_MAX.shortText),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(10_000_000, "Amount is too large"),
  classId: z.string().optional(),
  dueDate: z.string().optional(),
  frequency: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "ANNUALLY"]),
  description: optionalLongTextField("Description"),
});

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const schoolId = user.schoolId;
  if (!schoolId) return badRequest("School is required");

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const data = parsed.data;

    if (data.classId) {
      const cls = await prisma.class.findFirst({ where: { id: data.classId, schoolId } });
      if (!cls) return badRequest("Please enter correct value (Class)");
    }

    const academicYear = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });

    const structure = await prisma.feeStructure.create({
      data: {
        schoolId,
        classId: data.classId || null,
        academicYearId: academicYear?.id,
        feeType: data.feeType,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        frequency: data.frequency,
        description: data.description || null,
      },
    });
    return created(structure);
  } catch (e) {
    return serverError(e);
  }
}
