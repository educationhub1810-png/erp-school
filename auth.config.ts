import type { NextAuthConfig } from "next-auth";
import { ROLE_DASHBOARDS, ROLE_ALLOWED_PREFIXES, type AppRole } from "@/lib/roles";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];
// These paths are accessible to everyone regardless of session state
const OPEN_PATHS = ["/api/public", "/api/admin-access", "/admin-access", "/api/auth/otp"];

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

      // CSRF defense: for state-changing requests, require the Origin header to
      // match the host. Browsers always send Origin on POST/PUT/PATCH/DELETE, so
      // this blocks cross-site forged requests. NextAuth's own /api/auth routes
      // carry a dedicated CSRF token and are excluded.
      const method = request.method.toUpperCase();
      const isMutation = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
      if (isMutation && !pathname.startsWith("/api/auth")) {
        const origin = request.headers.get("origin");
        const host = request.headers.get("host");
        const originHost = origin ? (() => { try { return new URL(origin).host; } catch { return null; } })() : null;
        if (!originHost || originHost !== host) {
          return new Response("Forbidden: invalid origin", { status: 403 });
        }
      }

      if (OPEN_PATHS.some((p) => pathname.startsWith(p))) return true;

      // API routes handle their own auth via requireAuth — don't role-check them here
      if (pathname.startsWith("/api/")) return true;

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
        token.isImpersonating = (user as { isImpersonating?: boolean }).isImpersonating ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role: AppRole }).role = token.role as AppRole;
        (session.user as { schoolId?: string }).schoolId = token.schoolId as string | undefined;
        (session.user as { isImpersonating?: boolean }).isImpersonating = token.isImpersonating as boolean | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
