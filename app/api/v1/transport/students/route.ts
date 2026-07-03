import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const assignSchema = z.object({
  studentId:  z.string().min(1, "Student is required"),
  routeId:    z.string().min(1, "Route is required"),
  slabId:     z.string().optional().nullable(),
  stopName:   z.string().max(100).optional().nullable(),
  distanceKm: z.number().min(0).optional().nullable(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { schoolId } = getUser(session!);
  const url = new URL(req.url);
  const sid = url.searchParams.get("schoolId") ?? schoolId;
  if (!sid) return badRequest("schoolId required");

  const students = await prisma.transportStudent.findMany({
    where: { schoolId: sid },
    include: {
      student: {
        include: {
          user:    { select: { name: true } },
          class:   { select: { name: true } },
          section: { select: { name: true } },
        },
      },
      route: { select: { id: true, routeName: true } },
      slab:  { select: { id: true, label: true, amount: true, fromKm: true, toKm: true } },
    },
    orderBy: { student: { class: { name: "asc" } } },
  });
  return ok(students);
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { schoolId } = getUser(session!);
  if (!schoolId) return forbidden();

  try {
    const body = await req.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { studentId, routeId, slabId, stopName, distanceKm } = parsed.data;

    // Verify student belongs to school
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) return badRequest("Student not found");

    // Get fee amount from slab if provided
    let feeAmount: number | null = null;
    if (slabId) {
      const slab = await prisma.transportDistanceSlab.findFirst({ where: { id: slabId, schoolId } });
      if (!slab) return badRequest("Distance slab not found");
      feeAmount = slab.amount;
    }

    const assigned = await prisma.transportStudent.upsert({
      where: { studentId },
      create: {
        schoolId, studentId, routeId,
        slabId: slabId ?? null,
        stopName: stopName ?? null,
        distanceKm: distanceKm ?? null,
        feeAmount,
      },
      update: {
        routeId,
        slabId: slabId ?? null,
        stopName: stopName ?? null,
        distanceKm: distanceKm ?? null,
        feeAmount,
      },
    });
    return ok(assigned);
  } catch (e) {
    return serverError(e);
  }
}
