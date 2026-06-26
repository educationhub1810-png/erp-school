import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";

// Remove a user. A SUPER_ADMIN may remove anyone (except themselves); a
// SCHOOL_ADMIN may remove only non-super-admin users within their own school
// (and never themselves). The deletion cascades to the user's role profile and
// related records via the schema's onDelete rules; the one relation that would
// otherwise block it (Announcement.createdBy is Restrict) is cleared first in
// the same transaction.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const actor = getUser(session!);

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, schoolId: true },
    });
    if (!target) return notFound("User not found");

    // Never let an admin delete their own account — that is an immediate
    // self-lockout and, for the last admin, an unrecoverable one.
    if (target.id === actor.id) return forbidden();

    if (actor.role === "SCHOOL_ADMIN") {
      // Scoped to their own school and never a platform super admin.
      if (target.role === "SUPER_ADMIN") return forbidden();
      if (!actor.schoolId || target.schoolId !== actor.schoolId) return notFound("User not found");
    }

    await prisma.$transaction([
      // Clears the only Restrict FK (Announcement.createdBy); everything else
      // cascades or sets null per schema.
      prisma.announcement.deleteMany({ where: { createdById: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    await writeAuditLog({
      action: "USER_DELETE",
      actorId: actor.id,
      actorRole: actor.role,
      targetType: "User",
      targetId: target.id,
      schoolId: target.schoolId,
      ip: clientIp(req),
      metadata: { name: target.name, role: target.role },
    });

    return ok({ id: target.id });
  } catch (e) {
    return serverError(e);
  }
}
