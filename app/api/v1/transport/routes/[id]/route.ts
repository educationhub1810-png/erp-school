import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { z } from "zod";

const routeSchema = z.object({
  routeName:    z.string().min(1, "Route name is required").max(100),
  vehicleNumber: z.string().max(20).optional().nullable(),
  driverName:   z.string().max(100).optional().nullable(),
  driverMobile: z.string().max(15).optional().nullable(),
  capacity:     z.number().int().positive().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;
  const user = getUser(session!);

  try {
    const route = await prisma.transportRoute.findUnique({ where: { id } });
    if (!route) return notFound("Route not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== route.schoolId) return forbidden();

    const body = await req.json();
    const parsed = routeSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const updated = await prisma.transportRoute.update({
      where: { id },
      data: {
        routeName:    parsed.data.routeName,
        vehicleNumber: parsed.data.vehicleNumber ?? null,
        driverName:   parsed.data.driverName ?? null,
        driverMobile: parsed.data.driverMobile ?? null,
        capacity:     parsed.data.capacity ?? null,
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
    const route = await prisma.transportRoute.findUnique({ where: { id } });
    if (!route) return notFound("Route not found");
    if (user.role !== "SUPER_ADMIN" && user.schoolId !== route.schoolId) return forbidden();

    await prisma.transportRoute.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
