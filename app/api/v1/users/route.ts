import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { generateTotpSecret, totpKeyUri, encryptSecret, generateRecoveryCodes, hashRecoveryCodes } from "@/lib/totp";
import { z } from "zod";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

const createSchema = z.object({
  schoolId: z.string().optional(),
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().optional(),
  role: z.enum(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN", "TRANSPORT_MANAGER", "HR_MANAGER", "WARDEN_MANAGER", "MESS_MANAGER"]),
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

    // Only a Super Admin may create another school's admin account; a School
    // Admin creating staff for their own school still goes through this route
    // for the other roles below.
    if (data.role === "SCHOOL_ADMIN" && actor.role !== "SUPER_ADMIN") return forbidden();

    const schoolId = actor.role === "SUPER_ADMIN" ? data.schoolId : actor.schoolId;
    if (!schoolId) return badRequest("School is required");

    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) return badRequest("Email already registered");
    }

    const rawPassword = data.password || `${data.role.charAt(0)}${data.role.slice(1, 4).toLowerCase()}@123`;
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // The login form is code-only for School Admin (no email/password field at
    // all — see CODE_ONLY_ROLES in login-form.tsx), so a School Admin account
    // is unusable until it's TOTP-enrolled. Enroll it here, at creation time,
    // the same way `scripts/setup-school-admin-totp.ts` does, and hand the
    // one-time QR/secret/recovery codes back so the Super Admin can hand them
    // to the new admin immediately.
    const isSchoolAdmin = data.role === "SCHOOL_ADMIN";
    const totpSecret = isSchoolAdmin ? generateTotpSecret() : null;
    const recoveryCodes = isSchoolAdmin ? generateRecoveryCodes() : null;

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
        ...(totpSecret && recoveryCodes && {
          totpEnabled: true,
          totpSecret: encryptSecret(totpSecret),
          totpRecoveryCodes: JSON.stringify(await hashRecoveryCodes(recoveryCodes)),
        }),
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

    const totpQr = totpSecret ? await QRCode.toDataURL(totpKeyUri(data.email || data.name, totpSecret)) : null;

    return created({
      user,
      defaultPassword: rawPassword,
      ...(totpSecret && recoveryCodes && { totp: { secret: totpSecret, qr: totpQr, recoveryCodes } }),
    });
  } catch (e) {
    return serverError(e);
  }
}
