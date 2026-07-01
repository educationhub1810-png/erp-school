import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { optionalTextField, optionalLongTextField } from "@/lib/field-validation";
import { z } from "zod";

const updateSchema = z.object({
  amountPaid:   z.coerce.number().positive("Amount must be greater than 0").max(10_000_000, "Amount is too large"),
  paymentDate:  z.string().optional(),
  paymentMode:  z.enum(["CASH", "CHEQUE", "ONLINE", "NEFT", "UPI", "CARD"]),
  transactionId: optionalTextField("Transaction ID"),
  status:       z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"]),
  periodLabel:  z.string().max(100).optional(),
  remarks:      optionalLongTextField("Remarks"),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { id } = await params;

  try {
    const existing = await prisma.feePayment.findFirst({ where: { id, schoolId: user.schoolId! } });
    if (!existing) return notFound();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const data = parsed.data;

    const updated = await prisma.feePayment.update({
      where: { id },
      data: {
        amountPaid:    data.amountPaid,
        paymentDate:   data.paymentDate ? new Date(data.paymentDate) : undefined,
        paymentMode:   data.paymentMode,
        transactionId: data.transactionId || null,
        status:        data.status,
        periodLabel:   data.periodLabel || null,
        remarks:       data.remarks || null,
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
    const existing = await prisma.feePayment.findFirst({ where: { id, schoolId: user.schoolId! } });
    if (!existing) return notFound();

    await prisma.feePayment.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
