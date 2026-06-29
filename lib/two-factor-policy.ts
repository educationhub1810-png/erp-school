import { prisma } from "@/lib/prisma";
import { ROLES, ROLE_LABELS, TWO_FACTOR_ROLES, type AppRole } from "@/lib/roles";

// Server-side, DB-backed two-factor policy. Replaces the old hardcoded role
// check: Super Admin manages which roles require an emailed login code at
// /super-admin/settings, stored in the TwoFactorPolicy table.

export interface RoleTwoFactorPolicy {
  role: AppRole;
  label: string;
  required: boolean;
  /** Super Admin 2FA can't be turned off from the UI (security floor). */
  locked: boolean;
}

// The effective default for a role that has no explicit policy row yet.
function defaultRequired(role: AppRole): boolean {
  return TWO_FACTOR_ROLES.includes(role);
}

// Does this role need to complete the email-OTP step at login? Called from the
// login flow (auth.ts authorize and the OTP-request route).
export async function isTwoFactorRequired(role: string): Promise<boolean> {
  // Kill switch for browser tests, which can't read a real inbox.
  if (process.env.OTP_DISABLE_FOR_E2E === "1") return false;
  // Super Admin is always hardened — the API also refuses to disable it.
  if (role === ROLES.SUPER_ADMIN) return true;
  const policy = await prisma.twoFactorPolicy.findUnique({ where: { role } });
  if (policy) return policy.required;
  return defaultRequired(role as AppRole);
}

// The full per-role policy list for the settings UI, in the canonical role
// order, with explicit rows overlaid on the built-in defaults.
export async function getTwoFactorPolicies(): Promise<RoleTwoFactorPolicy[]> {
  const rows = await prisma.twoFactorPolicy.findMany();
  const overrides = new Map(rows.map((r) => [r.role, r.required]));
  return (Object.keys(ROLE_LABELS) as AppRole[]).map((role) => {
    const locked = role === ROLES.SUPER_ADMIN;
    return {
      role,
      label: ROLE_LABELS[role],
      required: locked ? true : overrides.get(role) ?? defaultRequired(role),
      locked,
    };
  });
}

// Upsert a role's policy. Caller (the API route) enforces that Super Admin
// cannot be disabled and that the role is valid.
export async function setTwoFactorPolicy(role: AppRole, required: boolean) {
  return prisma.twoFactorPolicy.upsert({
    where: { role },
    update: { required },
    create: { role, required },
  });
}
