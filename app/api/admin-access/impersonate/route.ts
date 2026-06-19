import { cookies } from "next/headers";
import { ok, forbidden, badRequest, serverError } from "@/lib/api-response";
import { createImpersonateToken } from "@/auth";
import { prisma } from "@/lib/prisma";
import { secureEquals } from "@/lib/secure-compare";
import { writeAuditLog, clientIp } from "@/lib/audit";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const adminKey = cookieStore.get("admin_access")?.value;
  if (!secureEquals(adminKey, process.env.ADMIN_SECRET_CODE)) return forbidden();

  try {
    const { userId } = await req.json();
    if (!userId) return badRequest("userId is required");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, role: true },
    });
    if (!user || !user.isActive) return badRequest("User not found or inactive");

    const token = createImpersonateToken(userId);

    await writeAuditLog({
      action: "IMPERSONATE_TOKEN_ISSUED",
      targetType: "user",
      targetId: userId,
      metadata: { role: user.role },
      ip: clientIp(req),
    });

    return ok({ token, role: user.role });
  } catch (e) {
    return serverError(e);
  }
}
