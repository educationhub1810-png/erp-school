import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  schoolId: z.string().optional(),
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
  role: z.enum(["PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN", "TRANSPORT_MANAGER", "HR_MANAGER", "WARDEN_MANAGER", "MESS_MANAGER"]),
  password: z.string().min(6, "Min 6 characters").optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_MANAGER"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const actor = getUser(session!);
  const { searchParams } = new URL(req.url);
  const schoolId = actor.role === "SUPER_ADMIN" ? (searchParams.get("schoolId") || undefined) : actor.schoolId;
  const role = searchParams.get("role");
  const search = searchParams.get("search");

  try {
    const users = await prisma.user.findMany({
      where: {
        schoolId: schoolId ?? undefined,
        ...(role && { role: role as never }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return ok(users);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const actor = getUser(session!);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;

    const schoolId = actor.role === "SUPER_ADMIN" ? data.schoolId : actor.schoolId;
    if (!schoolId) return badRequest("School is required");

    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) return badRequest("Email already registered");
    }

    const rawPassword = data.password || `${data.role.charAt(0)}${data.role.slice(1, 4).toLowerCase()}@123`;
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const user = await prisma.user.create({
      data: {
        schoolId,
        name: data.name,
        email: data.email || null,
        mobile: data.mobile || null,
        passwordHash,
        role: data.role,
        isActive: true,
        createdBy: session!.user.id,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    await writeAuditLog({
      action: "USER_CREATE",
      actorId: session!.user.id,
      actorRole: session!.user.role,
      schoolId,
      targetType: "user",
      targetId: user.id,
      metadata: { name: user.name, role: user.role },
      ip: clientIp(req),
    });

    return created({ user, defaultPassword: rawPassword });
  } catch (e) {
    return serverError(e);
  }
}
