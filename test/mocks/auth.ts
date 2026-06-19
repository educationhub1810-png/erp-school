import { vi } from "vitest";
import type { AppRole } from "@/lib/roles";

// Mock NextAuth's `auth()` (imported by lib/auth-guard). Tests set the current
// session with `setSession(sessionFor("TEACHER"))` or `setSession(null)`.
export const authMock = vi.fn(async () => null as unknown);

vi.mock("@/auth", () => ({
  auth: authMock,
  // Re-export the impersonation token helpers as the real implementation so
  // unit tests can exercise them; they have no Prisma/NextAuth dependency that
  // matters here. Overridable per-test if needed.
  createImpersonateToken: vi.fn(),
  verifyImpersonateToken: vi.fn(),
}));

export interface TestSession {
  user: {
    id: string;
    name: string;
    email?: string;
    role: AppRole;
    schoolId?: string;
    isImpersonating?: boolean;
  };
}

const DEFAULT_SCHOOL_ID = "school-1";

/** Build a session for a given role. SUPER_ADMIN has no schoolId by default. */
export function sessionFor(role: AppRole, overrides: Partial<TestSession["user"]> = {}): TestSession {
  return {
    user: {
      id: `user-${role.toLowerCase()}`,
      name: `Test ${role}`,
      email: `${role.toLowerCase()}@test.local`,
      role,
      schoolId: role === "SUPER_ADMIN" ? undefined : DEFAULT_SCHOOL_ID,
      ...overrides,
    },
  };
}

/** Make `auth()` return this session (or null for signed-out). */
export function setSession(session: TestSession | null) {
  authMock.mockResolvedValue(session);
}

export function resetAuthMock() {
  authMock.mockReset();
  authMock.mockResolvedValue(null);
}
