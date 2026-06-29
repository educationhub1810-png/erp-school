import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError, duplicateValue } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { nameField, emailField, mobileField } from "@/lib/field-validation";
import { z } from "zod";

const updateSchema = z.object({
  name: nameField().optional(),
  email: emailField(),
  mobile: mobileField(),
});

// Edit a user's profile/contact fields (name, email, mobile). Email is what 2FA
// codes are sent to, so keeping it correct matters. A SUPER_ADMIN may edit
// anyone; a SCHOOL_ADMIN only non-super-admin users within their own school.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const actor = getUser(session!);

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, schoolId: true, email: true, mobile: true },
    });
    if (!target) return notFound("User not found");

    if (actor.role === "SCHOOL_ADMIN") {
      if (target.role === "SUPER_ADMIN") return forbidden();
      if (!actor.schoolId || target.schoolId !== actor.schoolId) return notFound("User not found");
    }

    const parsed = updateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const { name, email, mobile } = parsed.data;

    // Reject an email already taken by a different account before we attempt the
    // write (the unique index is the backstop, surfaced via duplicateValue).
    if (email && email !== target.email) {
      const clash = await prisma.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
      if (clash) return badRequest("Email already registered");
    }

    const data: { name?: string; email?: string | null; mobile?: string | null } = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email || null;
    if (mobile !== undefined) data.mobile = mobile || null;

    if (Object.keys(data).length === 0) return badRequest("Nothing to update");

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, mobile: true, role: true },
    });

    await writeAuditLog({
      action: "USER_UPDATE",
      actorId: actor.id,
      actorRole: actor.role,
      schoolId: target.schoolId,
      targetType: "user",
      targetId: target.id,
      metadata: { name: user.name, role: user.role },
      ip: clientIp(req),
    });

    return ok(user);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return duplicateValue(e);
    return serverError(e);
  }
}

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
