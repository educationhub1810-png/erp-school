import { expect } from "vitest";
import { ROLES, type AppRole } from "@/lib/roles";
import { setSession, sessionFor } from "../mocks/auth";
import { callRoute, type ParsedResponse } from "./request";

const ALL_ROLES = Object.values(ROLES) as AppRole[];

type Handler = (req: Request, ctx?: unknown) => Promise<Response> | Response;

/**
 * Assert a handler's auth gate: 401 when signed out, 403 for every role not in
 * `allowed`, and not-401/403 for allowed roles. `makeReq` builds a fresh request
 * per role (handlers may read the body, which can only be consumed once).
 */
export async function expectRbac(
  handler: Handler,
  allowed: AppRole[],
  makeReq: () => Request,
  ctx?: unknown,
  userOverrides: Partial<{ schoolId: string; id: string }> = {},
) {
  setSession(null);
  const signedOut = await callRoute(handler, makeReq(), ctx);
  expect(signedOut.status, "signed-out should be 401").toBe(401);

  for (const role of ALL_ROLES) {
    setSession(sessionFor(role, userOverrides));
    const res: ParsedResponse = await callRoute(handler, makeReq(), ctx);
    if (allowed.includes(role)) {
      expect([401, 403], `${role} should be allowed`).not.toContain(res.status);
    } else {
      expect(res.status, `${role} should be forbidden`).toBe(403);
    }
  }
}
