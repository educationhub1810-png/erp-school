import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const slabSchema = z.object({
  label:  z.string().min(1, "Label is required").max(100),
  fromKm: z.number().min(0, "From km must be 0 or more"),
  toKm:   z.number().positive("To km must be positive").nullable().optional(),
  amount: z.number().positive("Amount must be positive"),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { schoolId } = getUser(session!);
  const url = new URL(req.url);
  const sid = url.searchParams.get("schoolId") ?? schoolId;
  if (!sid) return badRequest("schoolId required");

  const slabs = await prisma.transportDistanceSlab.findMany({
    where: { schoolId: sid },
    orderBy: { fromKm: "asc" },
  });
  return ok(slabs);
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { schoolId } = getUser(session!);
  if (!schoolId) return forbidden();

  try {
    const body = await req.json();
    const parsed = slabSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { label, fromKm, toKm, amount } = parsed.data;
    const slab = await prisma.transportDistanceSlab.create({
      data: { schoolId, label, fromKm, toKm: toKm ?? null, amount },
    });
    return ok(slab);
  } catch (e) {
    return serverError(e);
  }
}
