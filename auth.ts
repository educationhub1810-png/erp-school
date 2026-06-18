import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import type { AppRole } from "@/lib/roles";

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        schoolCode: { label: "School Code", type: "text" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        impersonateToken: { label: "Impersonate Token", type: "text" },
      },
      async authorize(credentials) {
        const { schoolCode, username, password, impersonateToken } = credentials as {
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
          if (!user) return null;
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
        if (!school || !school.isActive) return null;

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
        if (!user) return null;
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          role: user.role as AppRole,
          schoolId: school.id,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
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
