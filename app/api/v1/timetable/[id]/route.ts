import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SCHOOL_ADMIN", "TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const slot = await prisma.timetable.findUnique({ where: { id } });
    if (!slot) return notFound("Timetable slot not found");
    if (slot.schoolId !== user.schoolId) return forbidden();

    await prisma.timetable.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
