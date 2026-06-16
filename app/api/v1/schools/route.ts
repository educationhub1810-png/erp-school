import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  principalName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("India"),
  timezone: z.string().default("Asia/Kolkata"),
  currency: z.string().default("INR"),
  language: z.string().default("en"),
});

export async function GET() {
  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  try {
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { students: true, teachers: true, users: true } },
      },
    });
    return ok(schools);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;

    const existing = await prisma.school.findUnique({
      where: { code: data.code.toUpperCase() },
    });
    if (existing) return badRequest("School code already exists");

    const school = await prisma.school.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
        email: data.email || null,
      },
    });
    return created(school);
  } catch (e) {
    return serverError(e);
  }
}
