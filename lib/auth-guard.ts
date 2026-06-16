import { auth } from "@/auth";
import type { AppRole } from "@/lib/roles";

export async function requireAuth(allowedRoles?: AppRole[]) {
  const session = await auth();
  if (!session?.user) return { session: null, error: "unauthorized" as const };

  if (allowedRoles && !allowedRoles.includes(session.user.role as AppRole)) {
    return { session: null, error: "forbidden" as const };
  }

  return { session, error: null };
}
