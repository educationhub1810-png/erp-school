import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import type { AppRole } from "@/lib/roles";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { isTotpEnforced, verifyTotp, decryptSecret, matchRecoveryCode } from "@/lib/totp";

function dobToPassword(dob: Date): string {
  const d = String(dob.getUTCDate()).padStart(2, "0");
  const m = String(dob.getUTCMonth() + 1).padStart(2, "0");
  const y = String(dob.getUTCFullYear());
  return `${d}${m}${y}`;
}

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

type AuthorizedUser = {
  id: string;
  name: string;
  email?: string;
  role: AppRole;
  schoolId?: string;
  isImpersonating?: boolean;
};

// A throwaway bcrypt hash used to equalize timing on failed logins, so an
// attacker cannot distinguish "user/student exists" from "does not exist" by
// measuring whether a bcrypt comparison ran. (Mitigates account enumeration.)
const DUMMY_HASH = bcrypt.hashSync("nonexistent-account-placeholder", 12);

async function authorizeUser(
  credentials: Record<string, unknown> | undefined,
): Promise<AuthorizedUser | null> {
  const { role, username, password, totp, impersonateToken } = (credentials ?? {}) as {
    role: string;
    username: string;
    password: string;
    totp: string;
    impersonateToken: string;
  };

  // Impersonation path — short-lived signed token, no password needed
  if (impersonateToken) {
    const userId = verifyImpersonateToken(impersonateToken);
    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      role: user.role as AppRole,
      schoolId: user.schoolId ?? undefined,
      isImpersonating: true,
    };
  }

  if (!username || !password || !role) return null;

  // No school is collected on the login form — student codes and emails are
  // globally unique, so the account is resolved by username alone. The user
  // selects their role on the form and we enforce it against the account below.
  let candidate: AuthorizedUser | null = null;
  // The resolved DB row for non-student logins — needed for the super-admin
  // 2FA fields (totpSecret / totpEnabled / totpRecoveryCodes).
  let account: { id: string; totpSecret: string | null; totpEnabled: boolean; totpRecoveryCodes: string | null } | null =
    null;

  // 1. Student path — username = studentCode (global), password = DOB (DDMMYYYY)
  const student = await prisma.student.findFirst({
    where: { studentCode: username },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });
  if (student && student.user.isActive && student.dob && password === dobToPassword(student.dob)) {
    candidate = {
      id: student.user.id,
      name: student.user.name,
      email: student.user.email ?? undefined,
      role: student.user.role as AppRole,
      schoolId: student.schoolId ?? undefined,
    };
  }

  // 2. Everyone else (and students who log in with an email) — email/mobile + bcrypt
  if (!candidate) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: username }, { mobile: username }], isActive: true },
    });
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH); // equalize timing
      return null;
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    candidate = {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      role: user.role as AppRole,
      schoolId: user.schoolId ?? undefined,
    };
    account = user;
  }

  // Enforce the role the user selected on the form against their real account
  // role — a mismatch is treated as a failed login.
  if (candidate.role !== role) return null;

  // Super-admin two-factor: in enforced environments (production), an enrolled
  // super admin must also present a valid TOTP code or recovery code. Local dev
  // is password-only (isTotpEnforced() === false).
  if (candidate.role === "SUPER_ADMIN" && account?.totpEnabled && isTotpEnforced()) {
    const ok = await verifySuperAdminTotp(account, totp);
    if (!ok) return null;
  }

  return candidate;
}

// Verify a super admin's TOTP code, or a one-time recovery code. A used
// recovery code is consumed (removed) so it can't be replayed.
async function verifySuperAdminTotp(
  account: { id: string; totpSecret: string | null; totpRecoveryCodes: string | null },
  code: string | undefined,
): Promise<boolean> {
  if (!code || !account.totpSecret) return false;

  try {
    const secret = decryptSecret(account.totpSecret);
    if (verifyTotp(code, secret)) return true;
  } catch {
    return false;
  }

  // Fall back to a recovery code.
  if (account.totpRecoveryCodes) {
    const hashes = JSON.parse(account.totpRecoveryCodes) as string[];
    const idx = await matchRecoveryCode(code, hashes);
    if (idx >= 0) {
      hashes.splice(idx, 1);
      await prisma.user.update({
        where: { id: account.id },
        data: { totpRecoveryCodes: JSON.stringify(hashes) },
      });
      return true;
    }
  }
  return false;
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
        totp: { label: "Authenticator code", type: "text" },
        impersonateToken: { label: "Impersonate Token", type: "text" },
      },
      async authorize(credentials, request) {
        const user = await authorizeUser(credentials as Record<string, unknown> | undefined);
        const ip = request instanceof Request ? clientIp(request) : null;

        if (user) {
          await writeAuditLog({
            action: "LOGIN_SUCCESS",
            actorId: user.id,
            actorRole: user.role,
            schoolId: user.schoolId ?? null,
            ip,
            metadata: user.isImpersonating ? { impersonation: true } : undefined,
          });
        } else {
          const uname = (credentials as { username?: unknown } | undefined)?.username;
          await writeAuditLog({
            action: "LOGIN_FAILURE",
            ip,
            metadata: typeof uname === "string" ? { username: uname.slice(0, 120) } : undefined,
          });
        }

        return user;
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
