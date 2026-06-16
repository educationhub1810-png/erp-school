import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import type { AppRole } from "@/lib/roles";

function dobToPassword(dob: Date): string {
  const d = String(dob.getUTCDate()).padStart(2, "0");
  const m = String(dob.getUTCMonth() + 1).padStart(2, "0");
  const y = String(dob.getUTCFullYear());
  return `${d}${m}${y}`; // e.g. "15082005"
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        schoolCode: { label: "School Code", type: "text" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { schoolCode, username, password } = credentials as {
          schoolCode: string;
          username: string;
          password: string;
        };

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

        // 1. Try student — username = admissionNumber, password = DOB (DDMMYYYY)
        const student = await prisma.student.findFirst({
          where: { schoolId: school.id, admissionNumber: username },
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
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email?: string;
      role: AppRole;
      schoolId?: string;
    };
  }
}
