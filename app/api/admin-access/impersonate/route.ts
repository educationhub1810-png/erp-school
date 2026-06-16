import { cookies } from "next/headers";
import { ok, forbidden, badRequest, serverError } from "@/lib/api-response";
import { createImpersonateToken } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const adminKey = cookieStore.get("admin_access")?.value;
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_CODE) return forbidden();

  try {
    const { userId } = await req.json();
    if (!userId) return badRequest("userId is required");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, role: true },
    });
    if (!user || !user.isActive) return badRequest("User not found or inactive");

    const token = createImpersonateToken(userId);
    return ok({ token, role: user.role });
  } catch (e) {
    return serverError(e);
  }
}
