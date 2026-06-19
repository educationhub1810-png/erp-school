import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { z } from "zod";

const BOARD_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"] as const;

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

const ticketInclude = {
  school: { select: { name: true, code: true } },
  reporter: { select: { name: true, role: true } },
} as const;

// Strip the heavy screenshot blob from a ticket for list/board responses.
function toListView<T extends { screenshotUrl: string | null; createdAt: Date }>(ticket: T) {
  const { screenshotUrl, createdAt, ...rest } = ticket;
  return { ...rest, createdAt: createdAt.toISOString(), hasScreenshot: !!screenshotUrl };
}

// Detail view (includes the screenshot). School-scoped for non-Super-Admins.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth([...BOARD_ROLES]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { id } = await params;

  try {
    const ticket = await prisma.bugTicket.findUnique({ where: { id }, include: ticketInclude });
    if (!ticket) return notFound("Ticket not found");
    if (user.role !== "SUPER_ADMIN" && ticket.schoolId !== (user.schoolId ?? null)) return forbidden();

    return ok({ ...ticket, createdAt: ticket.createdAt.toISOString(), hasScreenshot: !!ticket.screenshotUrl });
  } catch (e) {
    return serverError(e);
  }
}

// Only the Super Admin can move tickets / change priority.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    if (parsed.data.status === undefined && parsed.data.priority === undefined) {
      return badRequest("Nothing to update");
    }

    const existing = await prisma.bugTicket.findUnique({ where: { id } });
    if (!existing) return notFound("Ticket not found");

    const ticket = await prisma.bugTicket.update({
      where: { id },
      data: { status: parsed.data.status, priority: parsed.data.priority },
      include: ticketInclude,
    });

    return ok(toListView(ticket));
  } catch (e) {
    return serverError(e);
  }
}

// Super Admin can delete any ticket; reporters can delete their own.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth([...BOARD_ROLES]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { id } = await params;

  try {
    const existing = await prisma.bugTicket.findUnique({ where: { id } });
    if (!existing) return notFound("Ticket not found");

    const canDelete = user.role === "SUPER_ADMIN" || existing.reporterId === user.id;
    if (!canDelete) return forbidden();

    await prisma.bugTicket.delete({ where: { id } });

    await writeAuditLog({
      action: "BUG_DELETE",
      actorId: user.id,
      actorRole: user.role,
      schoolId: existing.schoolId,
      targetType: "bug_ticket",
      targetId: id,
      ip: clientIp(req),
    });

    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}
