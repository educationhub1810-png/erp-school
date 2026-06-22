import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["TEACHER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const homework = await prisma.homework.findUnique({ where: { id } });
    if (!homework) return notFound("Homework not found");
    if (homework.schoolId !== user.schoolId) return forbidden();

    await prisma.homework.delete({ where: { id } });
    return ok({ deleted: true, title: homework.title });
  } catch (e) {
    return serverError(e);
  }
}
