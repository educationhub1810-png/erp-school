import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const slabSchema = z.object({
  label:  z.string().min(1, "Label is required").max(100),
  fromKm: z.number().min(0, "From km must be 0 or more"),
  toKm:   z.number().positive("To km must be positive").nullable().optional(),
  amount: z.number().positive("Amount must be positive"),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const slab = await prisma.transportDistanceSlab.findUnique({ where: { id } });
    if (!slab) return notFound("Slab not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== slab.schoolId) return forbidden();

    const body = await req.json();
    const parsed = slabSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { label, fromKm, toKm, amount } = parsed.data;
    const updated = await prisma.transportDistanceSlab.update({
      where: { id },
      data: { label, fromKm, toKm: toKm ?? null, amount },
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
    const slab = await prisma.transportDistanceSlab.findUnique({ where: { id } });
    if (!slab) return notFound("Slab not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== slab.schoolId) return forbidden();

    await prisma.transportDistanceSlab.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
