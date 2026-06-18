import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { searchParams } = new URL(req.url);
  const schoolId = user.role === "SUPER_ADMIN" ? searchParams.get("schoolId") : user.schoolId;
  if (!schoolId) return badRequest("schoolId is required");

  try {
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: { sections: true },
      orderBy: { name: "asc" },
    });
    return ok(classes);
  } catch (e) {
    return serverError(e);
  }
}
