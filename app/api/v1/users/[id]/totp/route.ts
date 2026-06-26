import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import {
  generateTotpSecret,
  totpKeyUri,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
} from "@/lib/totp";

// Super-admin–driven 2FA enrollment. Generates (or regenerates) a user's TOTP
// secret + one-time recovery codes and turns 2FA on. Because auth.ts enforces
// `passesEnrolledTotpGate` for any enrolled non-super-admin account, this also
// ENFORCES a 6-digit code at the user's next login. The plaintext secret and
// recovery codes are returned ONCE here and never stored in the clear.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const actor = getUser(session!);

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, schoolId: true, totpEnabled: true },
    });
    if (!target) return notFound("User not found");
    // Super admins are managed by the dedicated CLI script and are never listed
    // in this table; refuse here to avoid accidental self-lockout.
    if (target.role === "SUPER_ADMIN") return forbidden();

    const secret = generateTotpSecret();
    const recoveryCodes = generateRecoveryCodes();

    await prisma.user.update({
      where: { id },
      data: {
        totpSecret: encryptSecret(secret),
        totpEnabled: true,
        totpRecoveryCodes: JSON.stringify(await hashRecoveryCodes(recoveryCodes)),
      },
    });

    const label = target.email || `user-${target.id}`;
    const qrDataUrl = await QRCode.toDataURL(totpKeyUri(label, secret));

    await writeAuditLog({
      action: "USER_2FA_RESET",
      actorId: actor.id,
      actorRole: actor.role,
      targetType: "User",
      targetId: target.id,
      schoolId: target.schoolId,
      ip: clientIp(req),
      metadata: { regenerated: target.totpEnabled },
    });

    return ok({ qrDataUrl, secret, recoveryCodes, regenerated: target.totpEnabled });
  } catch (e) {
    return serverError(e);
  }
}
