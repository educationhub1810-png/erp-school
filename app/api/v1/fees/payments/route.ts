import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { created, badRequest, unauthorized, forbidden, serverError, duplicateValue } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  feeStructureId: z.string().min(1, "Fee structure is required"),
  amountPaid: z.coerce.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().optional(),
  paymentMode: z.enum(["CASH", "CHEQUE", "ONLINE", "NEFT", "UPI", "CARD"]),
  transactionId: z.string().optional(),
  status: z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"]),
  remarks: z.string().optional(),
});

function generateReceiptNumber(schoolCode: string): string {
  return `RCPT-${schoolCode}-${Date.now().toString().slice(-8)}`;
}

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

    const [student, feeStructure, school] = await Promise.all([
      prisma.student.findFirst({ where: { id: data.studentId, schoolId } }),
      prisma.feeStructure.findFirst({ where: { id: data.feeStructureId, schoolId } }),
      prisma.school.findUnique({ where: { id: schoolId }, select: { code: true } }),
    ]);
    if (!student) return badRequest("Please enter correct value (Student)");
    if (!feeStructure) return badRequest("Please enter correct value (Fee Structure)");

    const payment = await prisma.feePayment.create({
      data: {
        schoolId,
        studentId: data.studentId,
        feeStructureId: data.feeStructureId,
        amountPaid: data.amountPaid,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
        receiptNumber: generateReceiptNumber(school!.code),
        paymentMode: data.paymentMode,
        transactionId: data.transactionId || null,
        status: data.status,
        remarks: data.remarks || null,
      },
    });
    return created(payment);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") {
      return duplicateValue(e);
    }
    return serverError(e);
  }
}
