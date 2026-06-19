import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import type { AppRole } from "@/lib/roles";
import { writeAuditLog, clientIp } from "@/lib/audit";

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
  const { schoolCode, username, password, impersonateToken } = (credentials ?? {}) as {
    schoolCode: string;
    username: string;
    password: string;
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

  if (!username || !password) return null;

  const isSuperAdmin = !schoolCode || schoolCode.trim() === "";

  // Super admin: email/mobile + bcrypt password
  if (isSuperAdmin) {
    const user = await prisma.user.findFirst({
      where: {
        role: "SUPER_ADMIN",
        OR: [{ email: username }, { mobile: username }],
        isActive: true,
      },
    });
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH); // equalize timing
      return null;
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      role: user.role as AppRole,
      schoolId: undefined,
    };
  }

  // School login
  const school = await prisma.school.findUnique({
    where: { code: schoolCode.toUpperCase() },
  });
  if (!school || !school.isActive) {
    await bcrypt.compare(password, DUMMY_HASH); // equalize timing
    return null;
  }

  // 1. Try student — username = studentCode, password = DOB (DDMMYYYY)
  const student = await prisma.student.findFirst({
    where: { schoolId: school.id, studentCode: username },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, isActive: true },
      },
    },
  });
  if (student && student.user.isActive && student.dob) {
    if (password === dobToPassword(student.dob)) {
      return {
        id: student.user.id,
        name: student.user.name,
        email: student.user.email ?? undefined,
        role: student.user.role as AppRole,
        schoolId: school.id,
      };
    }
    await bcrypt.compare(password, DUMMY_HASH); // equalize timing with staff path
    return null; // found student but wrong DOB — don't fall through
  }

  // 2. Staff / teacher / school-admin — username = email or mobile, bcrypt password
  const user = await prisma.user.findFirst({
    where: {
      schoolId: school.id,
      OR: [{ email: username }, { mobile: username }],
      isActive: true,
    },
  });
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH); // equalize timing
    return null;
  }
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? undefined,
    role: user.role as AppRole,
    schoolId: school.id,
  };
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
  providers: [
    Credentials({
      credentials: {
        schoolCode: { label: "School Code", type: "text" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
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
