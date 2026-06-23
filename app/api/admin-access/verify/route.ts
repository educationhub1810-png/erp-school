import { cookies } from "next/headers";
import { ok, badRequest } from "@/lib/api-response";
import { secureEquals } from "@/lib/secure-compare";
import { isTotpEnforced } from "@/lib/totp";
import { verifyAnySuperAdminTotp } from "@/lib/super-admin-2fa";
import { writeAuditLog, clientIp } from "@/lib/audit";

// Admin-access ("Support") gate. Two factors:
//   1. the shared access code (ADMIN_SECRET_CODE), and
//   2. a live TOTP / recovery code from an enrolled super admin.
// TOTP is required in production (isTotpEnforced); localhost is code-only.
export async function POST(req: Request) {
  const { code, totp } = await req.json();
  const ip = clientIp(req);

  if (!secureEquals(code, process.env.ADMIN_SECRET_CODE)) {
    await writeAuditLog({ action: "ADMIN_ACCESS_DENIED", ip, metadata: { reason: "bad_code" } });
    return badRequest("Invalid code");
  }

  if (isTotpEnforced()) {
    const okTotp = await verifyAnySuperAdminTotp(typeof totp === "string" ? totp : undefined);
    if (!okTotp) {
      await writeAuditLog({ action: "ADMIN_ACCESS_DENIED", ip, metadata: { reason: "bad_totp" } });
      return badRequest("Invalid authenticator code");
    }
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_access", code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 4 * 60 * 60, // 4 hours
    path: "/",
  });

  await writeAuditLog({ action: "ADMIN_ACCESS_GRANTED", ip });
  return ok({ verified: true });
}
