import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { daysBetweenInclusive, LEAVE_TYPES, LEAVE_APPLICANT_ROLE_FOR_APPROVER } from "@/lib/leave";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  leaveType: z.enum(LEAVE_TYPES as unknown as [string, ...string[]]).default("CASUAL"),
  reason: z.string().optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["TEACHER", "STUDENT", "PRINCIPAL"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") === "approvals" ? "approvals" : "mine";

  try {
    if (scope === "approvals") {
      const applicantRole = LEAVE_APPLICANT_ROLE_FOR_APPROVER[user.role];
      if (!applicantRole) return forbidden();
      const requests = await prisma.leaveRequest.findMany({
        where: { schoolId: user.schoolId, user: { role: applicantRole as never } },
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
      });
      return ok(requests);
    }

    const requests = await prisma.leaveRequest.findMany({
      where: { userId: user.id, schoolId: user.schoolId },
      orderBy: { createdAt: "desc" },
    });
    return ok(requests);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["TEACHER", "STUDENT"]);
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

    const fromDate = new Date(data.fromDate);
    const toDate = new Date(data.toDate);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return badRequest("Please enter correct value (Date)");
    }
    if (daysBetweenInclusive(fromDate, toDate) < 1) {
      return badRequest("To date must be on or after the from date");
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        schoolId,
        userId: user.id,
        fromDate,
        toDate,
        leaveType: data.leaveType as never,
        reason: data.reason || null,
      },
    });
    return created(leaveRequest);
  } catch (e) {
    return serverError(e);
  }
}
