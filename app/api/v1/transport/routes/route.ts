import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const routeSchema = z.object({
  routeName:    z.string().min(1, "Route name is required").max(100),
  vehicleNumber: z.string().max(20).optional().nullable(),
  driverName:   z.string().max(100).optional().nullable(),
  driverMobile: z.string().max(15).optional().nullable(),
  capacity:     z.number().int().positive().optional().nullable(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { schoolId } = getUser(session!);
  const url = new URL(req.url);
  const sid = url.searchParams.get("schoolId") ?? schoolId;
  if (!sid) return badRequest("schoolId required");

  const routes = await prisma.transportRoute.findMany({
    where: { schoolId: sid },
    include: { _count: { select: { students: true } } },
    orderBy: { routeName: "asc" },
  });
  return ok(routes);
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { schoolId } = getUser(session!);
  if (!schoolId) return forbidden();

  try {
    const body = await req.json();
    const parsed = routeSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const route = await prisma.transportRoute.create({
      data: {
        schoolId,
        routeName:    parsed.data.routeName,
        vehicleNumber: parsed.data.vehicleNumber ?? null,
        driverName:   parsed.data.driverName ?? null,
        driverMobile: parsed.data.driverMobile ?? null,
        capacity:     parsed.data.capacity ?? null,
      },
    });
    return ok(route);
  } catch (e) {
    return serverError(e);
  }
}
