import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
    return ok(schools);
  } catch (e) {
    return serverError(e);
  }
}
