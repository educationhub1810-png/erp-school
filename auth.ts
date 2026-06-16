import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import type { AppRole } from "@/lib/roles";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        schoolCode: { label: "School Code", type: "text" },
        email: { label: "Email / Mobile", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { schoolCode, email, password } = credentials as {
          schoolCode: string;
          email: string;
          password: string;
        };

        if (!email || !password) return null;

        const isSuperAdmin = !schoolCode || schoolCode.trim() === "";

        let user;

        if (isSuperAdmin) {
          user = await prisma.user.findFirst({
            where: {
              role: "SUPER_ADMIN",
              OR: [{ email }, { mobile: email }],
              isActive: true,
            },
          });
        } else {
          const school = await prisma.school.findUnique({
            where: { code: schoolCode.toUpperCase() },
          });
          if (!school) return null;

          user = await prisma.user.findFirst({
            where: {
              schoolId: school.id,
              OR: [{ email }, { mobile: email }],
              isActive: true,
            },
          });
        }

        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          role: user.role as AppRole,
          schoolId: user.schoolId ?? undefined,
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

