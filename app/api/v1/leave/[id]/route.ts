import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { LEAVE_APPLICANT_ROLE_FOR_APPROVER } from "@/lib/leave";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["TEACHER", "PRINCIPAL"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const body = await req.json();
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: { select: { role: true } } },
    });
    if (!leaveRequest) return notFound("Leave request not found");
    if (leaveRequest.schoolId !== user.schoolId) return forbidden();
    if (leaveRequest.user.role !== LEAVE_APPLICANT_ROLE_FOR_APPROVER[user.role]) return forbidden();
    if (leaveRequest.status !== "PENDING") return badRequest("This leave request has already been decided");

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: parsed.data.status, approvedById: user.id, approvedAt: new Date() },
    });
    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}
