import { describe, it, expect } from "vitest";
import { authConfig } from "@/auth.config";
import type { AppRole } from "@/lib/roles";

const authorized = authConfig.callbacks!.authorized!;

const ORIGIN = "https://app.example";

interface ReqOpts {
  method?: string;
  origin?: string | null; // Origin header
  host?: string | null;
}

// Minimal NextRequest-like object covering the fields the callback reads.
function makeRequest(pathname: string, opts: ReqOpts = {}) {
  const headers = new Map<string, string>();
  if (opts.origin !== null) headers.set("origin", opts.origin ?? ORIGIN);
  headers.set("host", opts.host ?? "app.example");
  return {
    method: opts.method ?? "GET",
    headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
    nextUrl: { pathname, origin: ORIGIN },
  } as never;
}

function sessionWith(role: AppRole) {
  return { user: { role } } as never;
}

// `authorized` returns `true`, or a Response (redirect / 403).
function asResponse(v: unknown): Response | null {
  return v instanceof Response ? v : null;
}

describe("authConfig.authorized — CSRF origin check", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])("403s a %s with a mismatched Origin", (method) => {
    const res = asResponse(
      authorized({ auth: sessionWith("TEACHER"), request: makeRequest("/teacher/x", { method, origin: "https://evil.test" }) }),
    );
    expect(res?.status).toBe(403);
  });

  it("403s a mutation with no Origin header", () => {
    const res = asResponse(
      authorized({ auth: sessionWith("TEACHER"), request: makeRequest("/teacher/x", { method: "POST", origin: null }) }),
    );
    expect(res?.status).toBe(403);
  });

  it("allows a same-origin mutation to proceed past the CSRF gate", () => {
    // /api/* short-circuits to true after the CSRF check passes.
    const res = authorized({
      auth: sessionWith("TEACHER"),
      request: makeRequest("/api/v1/students", { method: "POST" }),
    });
    expect(res).toBe(true);
  });

  it("never CSRF-checks the NextAuth routes", () => {
    const res = authorized({
      auth: null,
      request: makeRequest("/api/auth/callback", { method: "POST", origin: null }),
    });
    expect(res).toBe(true);
  });
});

describe("authConfig.authorized — routing & RBAC", () => {
  it("lets open paths through without a session", () => {
    expect(authorized({ auth: null, request: makeRequest("/api/admin-access/users") })).toBe(true);
    expect(authorized({ auth: null, request: makeRequest("/admin-access") })).toBe(true);
  });

  it("redirects an unauthenticated user to /login with callbackUrl", () => {
    const res = asResponse(authorized({ auth: null, request: makeRequest("/teacher/dashboard") }));
    const loc = res!.headers.get("location")!;
    expect(loc).toContain("/login");
    expect(loc).toContain("callbackUrl=%2Fteacher%2Fdashboard");
  });

  it("redirects a signed-in user away from /login to their dashboard", () => {
    const res = asResponse(authorized({ auth: sessionWith("STUDENT"), request: makeRequest("/login") }));
    expect(res!.headers.get("location")).toContain("/student/dashboard");
  });

  it("allows a role into its own area", () => {
    expect(authorized({ auth: sessionWith("TEACHER"), request: makeRequest("/teacher/classes") })).toBe(true);
  });

  it("redirects a role out of another role's area to its own dashboard", () => {
    const res = asResponse(authorized({ auth: sessionWith("TEACHER"), request: makeRequest("/super-admin/users") }));
    expect(res!.headers.get("location")).toContain("/teacher/dashboard");
  });
});
