import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  routeId:    z.string().min(1, "Route is required"),
  slabId:     z.string().optional().nullable(),
  stopName:   z.string().max(100).optional().nullable(),
  distanceKm: z.number().min(0).optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const record = await prisma.transportStudent.findUnique({ where: { id } });
    if (!record) return notFound("Assignment not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== record.schoolId) return forbidden();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { routeId, slabId, stopName, distanceKm } = parsed.data;

    let feeAmount: number | null = null;
    if (slabId) {
      const slab = await prisma.transportDistanceSlab.findUnique({ where: { id: slabId } });
      feeAmount = slab?.amount ?? null;
    }

    const updated = await prisma.transportStudent.update({
      where: { id },
      data: {
        routeId,
        slabId: slabId ?? null,
        stopName: stopName ?? null,
        distanceKm: distanceKm ?? null,
        feeAmount,
      },
    });
    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const record = await prisma.transportStudent.findUnique({ where: { id } });
    if (!record) return notFound("Assignment not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== record.schoolId) return forbidden();

    await prisma.transportStudent.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
