import { NextResponse } from "next/server";
import { z } from "zod";
import { ok, badRequest } from "@/lib/api-response";
import { resolveCredentials } from "@/lib/auth-credentials";
import { isTwoFactorRequired } from "@/lib/two-factor-policy";
import { generateOtp, hashOtp, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, clientIp } from "@/lib/audit";

const schema = z.object({
  role: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

// Step 1 of email-OTP login: validate the password and, for 2FA roles, email a
// fresh code. This route is intentionally pre-auth (no session) and is exempt
// from the role gate in auth.config.ts. It never reveals whether a password is
// correct — `requires2fa:false` simply means "proceed straight to sign-in".
export async function POST(req: Request) {
  const ip = clientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request body");

  const { role, username, password } = parsed.data;

  // No 2FA for this role → tell the client to sign in directly. (We don't even
  // need to validate the password here; sign-in will.)
  if (!(await isTwoFactorRequired(role))) return ok({ requires2fa: false });

  const candidate = await resolveCredentials({ role, username, password });
  // Wrong password (or role mismatch) → behave exactly like the no-2FA case so
  // we don't leak which admin emails/passwords are valid. Sign-in then fails.
  if (!candidate || !candidate.email) return ok({ requires2fa: false });

  // Resend throttle: if a still-valid code was issued moments ago, don't send
  // another — protects the mailbox and rate-limits abuse.
  const recent = await prisma.loginOtp.findFirst({
    where: { userId: candidate.id, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return NextResponse.json(
      { success: false, error: "A code was just sent. Please wait a minute before requesting another." },
      { status: 429 },
    );
  }

  const code = generateOtp();
  const codeHash = await hashOtp(code);

  // Drop any earlier un-consumed codes so only the newest is live.
  await prisma.loginOtp.deleteMany({ where: { userId: candidate.id, consumedAt: null } });
  await prisma.loginOtp.create({
    data: {
      userId: candidate.id,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendOtpEmail(candidate.email, code);

  await writeAuditLog({
    action: "OTP_SENT",
    actorId: candidate.id,
    actorRole: candidate.role,
    schoolId: candidate.schoolId ?? null,
    ip,
  });

  return ok({ requires2fa: true });
}
