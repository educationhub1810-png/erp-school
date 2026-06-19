import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const BOARD_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"] as const;

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

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
      include: {
        school: { select: { name: true, code: true } },
        reporter: { select: { name: true, role: true } },
      },
    });

    return ok(ticket);
  } catch (e) {
    return serverError(e);
  }
}

// Super Admin can delete any ticket; reporters can delete their own.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}
