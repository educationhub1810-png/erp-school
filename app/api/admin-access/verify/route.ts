import { cookies } from "next/headers";
import { ok, badRequest } from "@/lib/api-response";
import { secureEquals } from "@/lib/secure-compare";
import { writeAuditLog, clientIp } from "@/lib/audit";

// Admin-access ("Support") gate — the shared access code (ADMIN_SECRET_CODE).
export async function POST(req: Request) {
  const { code } = await req.json();
  const ip = clientIp(req);

  if (!secureEquals(code, process.env.ADMIN_SECRET_CODE)) {
    await writeAuditLog({ action: "ADMIN_ACCESS_DENIED", ip, metadata: { reason: "bad_code" } });
    return badRequest("Invalid code");
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
