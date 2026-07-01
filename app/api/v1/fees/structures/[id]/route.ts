import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { requiredTextField, optionalLongTextField, FIELD_MAX } from "@/lib/field-validation";
import { z } from "zod";

const updateSchema = z.object({
  feeType:       requiredTextField("Fee type", FIELD_MAX.shortText),
  amount:        z.coerce.number().positive("Amount must be greater than 0").max(10_000_000, "Amount is too large"),
  dueDate:       z.string().optional(),
  monthlyDueDay: z.coerce.number().int().min(1).max(31).optional(),
  installments:  z.array(z.object({ period: z.string(), dueDate: z.string().optional() })).optional(),
  description:   optionalLongTextField("Description"),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { id } = await params;

  try {
    const existing = await prisma.feeStructure.findFirst({ where: { id, schoolId: user.schoolId! } });
    if (!existing) return notFound();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const data = parsed.data;

    const updated = await prisma.feeStructure.update({
      where: { id },
      data: {
        feeType:       data.feeType,
        amount:        data.amount,
        dueDate:       data.dueDate ? new Date(data.dueDate) : null,
        monthlyDueDay: data.monthlyDueDay ?? null,
        installments:  data.installments ? JSON.parse(JSON.stringify(data.installments)) : null,
        description:   data.description || null,
      },
    });
    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { id } = await params;

  try {
    const existing = await prisma.feeStructure.findFirst({ where: { id, schoolId: user.schoolId! } });
    if (!existing) return notFound();

    await prisma.feeStructure.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
