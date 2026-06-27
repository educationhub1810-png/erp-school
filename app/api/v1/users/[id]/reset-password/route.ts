import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, unauthorized, forbidden, notFound, badRequest, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { generatePassword } from "@/lib/password";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Reset any user's login password. This is a SUPER_ADMIN-only break-glass tool —
// the target may be anyone, including another Super Admin, so it is deliberately
// not exposed to School Admins. Two modes:
//   - mode "set":      use the password supplied in the body (min 6 chars)
//   - mode "generate": ignore any supplied password and create a strong random one
// The resulting plaintext is returned once so the admin can hand it to the user;
// it is never written to the audit log.
const schema = z
  .object({
    mode: z.enum(["set", "generate"]),
    password: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "set" && (data.password ?? "").length < 6) {
      ctx.addIssue({ code: "custom", message: "Password must be at least 6 characters", path: ["password"] });
    }
  });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const actor = getUser(session!);

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, schoolId: true },
    });
    if (!target) return notFound("User not found");

    const password = parsed.data.mode === "generate" ? generatePassword() : parsed.data.password!;
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash },
    });

    await writeAuditLog({
      action: "USER_PASSWORD_RESET",
      actorId: actor.id,
      actorRole: actor.role,
      targetType: "User",
      targetId: target.id,
      schoolId: target.schoolId,
      ip: clientIp(req),
      metadata: { name: target.name, role: target.role, mode: parsed.data.mode },
    });

    return ok({ id: target.id, password });
  } catch (e) {
    return serverError(e);
  }
}
