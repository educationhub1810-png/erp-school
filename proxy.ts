import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";
import { authConfig } from "./auth.config";
import { productUrl, shouldRedirectToProduct } from "./lib/company-domain";

const { auth } = NextAuth(authConfig);

// auth's exported type only covers `auth(request)` used as the whole proxy
// export, or `auth(callback)` wrapping — not calling it inline ourselves —
// so cast for this one call. Runtime behavior is identical to `export const
// proxy = auth` (the `args[0] instanceof Request` branch in next-auth).
const authProxy = auth as unknown as NextMiddleware;

// "/" already renders the KreTech company page on kretech.in (see
// app/page.tsx, host-aware). Every other *page* path (login, dashboards, ...)
// bounces to the same path on isms.study instead of serving the product
// app — kretech.in stays a thin company front door. API routes are excluded:
// the company page's own fetch calls (e.g. the demo-request form) must be
// served by this same deployment, not redirected cross-origin to isms.study
// — a redirected fetch() there gets blocked by connect-src 'self' CSP anyway.
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (shouldRedirectToProduct(request.headers.get("host"), pathname)) {
    return NextResponse.redirect(productUrl(pathname, request.nextUrl.search));
  }
  return authProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov|m4v)$).*)",
  ],
};
