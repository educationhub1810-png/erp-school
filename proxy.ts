import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";
import { authConfig } from "./auth.config";
import { isCompanyHost, productUrl } from "./lib/company-domain";

const { auth } = NextAuth(authConfig);

// auth's exported type only covers `auth(request)` used as the whole proxy
// export, or `auth(callback)` wrapping — not calling it inline ourselves —
// so cast for this one call. Runtime behavior is identical to `export const
// proxy = auth` (the `args[0] instanceof Request` branch in next-auth).
const authProxy = auth as unknown as NextMiddleware;

// "/" already renders the VSkreative company page for every host (see
// app/page.tsx). On kretech.in specifically, every other path (login,
// dashboards, ...) bounces to the same path on isms.study instead of
// serving the product app — kretech.in stays a thin company front door.
export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isCompanyHost(request.headers.get("host")) && request.nextUrl.pathname !== "/") {
    return NextResponse.redirect(productUrl(request.nextUrl.pathname, request.nextUrl.search));
  }
  return authProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov|m4v)$).*)",
  ],
};
