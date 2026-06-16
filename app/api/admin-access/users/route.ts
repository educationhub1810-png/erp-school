import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ok, forbidden, badRequest, serverError } from "@/lib/api-response";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const adminKey = cookieStore.get("admin_access")?.value;
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_CODE) return forbidden();

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const role = searchParams.get("role");

  if (!role) return badRequest("role is required");

  try {
    const where: Record<string, unknown> = { isActive: true, role };
    if (schoolId) where.schoolId = schoolId;
    else if (role !== "SUPER_ADMIN") where.schoolId = null; // only super admin has no school

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        schoolId: true,
        student: { select: { admissionNumber: true } },
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    return ok(users);
  } catch (e) {
    return serverError(e);
  }
}
