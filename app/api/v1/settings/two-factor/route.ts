import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { ROLES, type AppRole } from "@/lib/roles";
import { getTwoFactorPolicies, setTwoFactorPolicy } from "@/lib/two-factor-policy";
import { revalidatePath } from "next/cache";

const updateSchema = z.object({
  role: z.enum(Object.values(ROLES) as [AppRole, ...AppRole[]]),
  required: z.boolean(),
});

// GET — the per-role 2FA policy list for the Super Admin settings screen.
export async function GET() {
  const { error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  try {
    return ok(await getTwoFactorPolicies());
  } catch (e) {
    return serverError(e);
  }
}

// PUT — turn 2FA on/off for a single role. Super Admin's own 2FA is locked on.
export async function PUT(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);

  try {
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { role, required } = parsed.data;
    if (role === ROLES.SUPER_ADMIN && !required) {
      return badRequest("Super Admin two-factor cannot be disabled.");
    }

    await setTwoFactorPolicy(role, required);

    await writeAuditLog({
      action: "TWO_FACTOR_POLICY_UPDATE",
      actorId: user.id,
      actorRole: user.role,
      targetType: "role",
      targetId: role,
      metadata: { role, required },
      ip: clientIp(req),
    });

    revalidatePath("/super-admin/settings");
    return ok({ role, required });
  } catch (e) {
    return serverError(e);
  }
}
