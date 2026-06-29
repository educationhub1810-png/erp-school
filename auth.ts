import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import type { AppRole } from "@/lib/roles";
import { isTwoFactorRequired } from "@/lib/two-factor-policy";
import { writeAuditLog, clientIp } from "@/lib/audit";
import {
  type AuthorizedUser,
  resolveCredentials,
  verifyAndConsumeOtp,
} from "@/lib/auth-credentials";

export function createImpersonateToken(userId: string): string {
  const code = process.env.ADMIN_SECRET_CODE!;
  const exp = Math.floor(Date.now() / 1000) + 120; // 2 min validity
  const data = `${userId}:${exp}`;
  const sig = crypto.createHmac("sha256", code).update(data).digest("hex");
  return Buffer.from(JSON.stringify({ userId, exp, sig })).toString("base64url");
}

export function verifyImpersonateToken(token: string): string | null {
  try {
    const code = process.env.ADMIN_SECRET_CODE;
    if (!code) return null;
    const { userId, exp, sig } = JSON.parse(Buffer.from(token, "base64url").toString());
    if (!userId || !exp || !sig) return null;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    const expected = crypto.createHmac("sha256", code).update(`${userId}:${exp}`).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
    return userId as string;
  } catch {
    return null;
  }
}

// Returned alongside the user so the provider can distinguish a wrong password
// from a wrong/expired second factor for audit purposes.
type AuthorizeResult =
  | { user: AuthorizedUser; otpFailed?: false }
  | { user: null; otpFailed: boolean };

async function authorizeUser(
  credentials: Record<string, unknown> | undefined,
): Promise<AuthorizeResult> {
  const { role, username, password, otp, impersonateToken } = (credentials ?? {}) as {
    role: string;
    username: string;
    password: string;
    otp?: string;
    impersonateToken: string;
  };

  // Impersonation path — short-lived signed token, no password or 2FA needed.
  if (impersonateToken) {
    const userId = verifyImpersonateToken(impersonateToken);
    if (!userId) return { user: null, otpFailed: false };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return { user: null, otpFailed: false };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        role: user.role as AppRole,
        schoolId: user.schoolId ?? undefined,
        isImpersonating: true,
      },
    };
  }

  const candidate = await resolveCredentials({ role, username, password });
  if (!candidate) return { user: null, otpFailed: false };

  // Second factor: roles configured to require 2FA must present a valid emailed
  // OTP. The code was issued by /api/auth/otp/request once the password checked
  // out. The policy is managed by Super Admin (see lib/two-factor-policy.ts).
  if (await isTwoFactorRequired(candidate.role)) {
    const okOtp = await verifyAndConsumeOtp(candidate.id, otp ?? "");
    if (!okOtp) return { user: null, otpFailed: true };
  }

  return { user: candidate };
}

// Re-validate the user against the DB at most this often (seconds), so that
// deactivating/deleting a user revokes their JWT session promptly without a
// DB read on every request.
const REVALIDATE_INTERVAL = 300; // 5 minutes

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Node-runtime jwt callback (has DB access) — overrides the edge-safe one
    // in auth.config.ts to enforce server-side revocation.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: AppRole }).role;
        token.schoolId = (user as { schoolId?: string }).schoolId;
        token.isImpersonating = (user as { isImpersonating?: boolean }).isImpersonating ?? false;
        token.checkedAt = Math.floor(Date.now() / 1000);
        return token;
      }

      const now = Math.floor(Date.now() / 1000);
      const checkedAt = (token.checkedAt as number | undefined) ?? 0;
      if (token.id && now - checkedAt > REVALIDATE_INTERVAL) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isActive: true, role: true, schoolId: true },
        });
        // User deleted or deactivated → invalidate the session.
        if (!dbUser || !dbUser.isActive) return null;
        token.role = dbUser.role as AppRole;
        token.schoolId = dbUser.schoolId ?? undefined;
        token.checkedAt = now;
      }
      return token;
    },
  },
  events: {
    // Record sign-outs. With the jwt strategy this fires with the user's token.
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (!token?.id) return;
      await writeAuditLog({
        action: "LOGOUT",
        actorId: token.id as string,
        actorRole: (token.role as string) ?? null,
        schoolId: (token.schoolId as string | undefined) ?? null,
      });
    },
  },
  providers: [
    Credentials({
      credentials: {
        role: { label: "Role", type: "text" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        impersonateToken: { label: "Impersonate Token", type: "text" },
      },
      async authorize(credentials, request) {
        const result = await authorizeUser(credentials as Record<string, unknown> | undefined);
        const ip = request instanceof Request ? clientIp(request) : null;

        if (result.user) {
          await writeAuditLog({
            action: "LOGIN_SUCCESS",
            actorId: result.user.id,
            actorRole: result.user.role,
            schoolId: result.user.schoolId ?? null,
            ip,
            metadata: result.user.isImpersonating ? { impersonation: true } : undefined,
          });
        } else {
          const uname = (credentials as { username?: unknown } | undefined)?.username;
          await writeAuditLog({
            // A correct password but bad/expired OTP is logged distinctly so the
            // audit trail separates 2FA failures from wrong passwords.
            action: result.otpFailed ? "LOGIN_2FA_FAILURE" : "LOGIN_FAILURE",
            ip,
            metadata: typeof uname === "string" ? { username: uname.slice(0, 120) } : undefined,
          });
        }

        return result.user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12h (was 30d) — bounds exposure of a stolen token
    updateAge: 60 * 60, // refresh/rotate the JWT at most hourly
  },
});

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    role: AppRole;
    schoolId?: string;
    isImpersonating?: boolean;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email?: string;
      role: AppRole;
      schoolId?: string;
      isImpersonating?: boolean;
    };
  }
}
