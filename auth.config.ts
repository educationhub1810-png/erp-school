import type { NextAuthConfig } from "next-auth";
import { ROLE_DASHBOARDS, ROLE_ALLOWED_PREFIXES, type AppRole } from "@/lib/roles";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];
const PUBLIC_API_PATHS = ["/api/public"];

// Lightweight config — no Prisma, safe for Edge Runtime (middleware)
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) return true;

      const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

      if (isPublic) {
        if (auth?.user) {
          const role = (auth.user as { role: AppRole }).role;
          return Response.redirect(
            new URL(ROLE_DASHBOARDS[role], request.nextUrl.origin)
          );
        }
        return true;
      }

      if (!auth?.user) {
        const loginUrl = new URL("/login", request.nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }

      const role = (auth.user as { role: AppRole }).role;
      const allowed = ROLE_ALLOWED_PREFIXES[role] ?? [];
      const isAllowed = allowed.some((prefix) => pathname.startsWith(prefix));

      if (!isAllowed) {
        return Response.redirect(
          new URL(ROLE_DASHBOARDS[role], request.nextUrl.origin)
        );
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: AppRole }).role;
        token.schoolId = (user as { schoolId?: string }).schoolId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role: AppRole }).role = token.role as AppRole;
        (session.user as { schoolId?: string }).schoolId = token.schoolId as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
