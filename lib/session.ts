import type { AppRole } from "@/lib/roles";

// Typed session user — avoids `as any` casts throughout the app
export interface SessionUser {
  id: string;
  name: string;
  email?: string;
  role: AppRole;
  schoolId?: string;
}

export function getUser(session: { user: unknown }): SessionUser {
  return session.user as SessionUser;
}
