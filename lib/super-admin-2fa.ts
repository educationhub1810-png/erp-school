import { prisma } from "@/lib/prisma";
import { verifyTotp, decryptSecret, matchRecoveryCode } from "@/lib/totp";

export interface TotpAccount {
  id: string;
  totpSecret: string | null;
  totpRecoveryCodes: string | null;
}

/**
 * The full super-admin login 2FA gate.
 *   - Not enforced (localhost): always passes (password-only).
 *   - Enforced (production): the account MUST be TOTP-enrolled (no bypass for
 *     legacy/un-enrolled super admins) AND present a valid code.
 */
export async function passesSuperAdminGate(
  account: (TotpAccount & { totpEnabled: boolean }) | null,
  code: string | undefined,
  enforced: boolean,
): Promise<boolean> {
  if (!enforced) return true;
  if (!account?.totpEnabled) return false;
  return verifySuperAdminTotp(account, code);
}

/**
 * Opt-in 2FA gate for non-super-admin accounts (e.g. SCHOOL_ADMIN).
 *   - Account NOT enrolled (totpEnabled false / no account): passes — these
 *     users stay password-only so enabling 2FA for one admin can't lock the
 *     rest out.
 *   - Account enrolled: a valid TOTP (or recovery) code is REQUIRED, in every
 *     environment (no localhost bypass — an enrolled account always proves 2FA).
 */
export async function passesEnrolledTotpGate(
  account: (TotpAccount & { totpEnabled: boolean }) | null,
  code: string | undefined,
): Promise<boolean> {
  if (!account?.totpEnabled) return true;
  return verifySuperAdminTotp(account, code);
}

/**
 * Verify a TOTP code (or a one-time recovery code) against a specific account.
 * A used recovery code is consumed so it can't be replayed.
 */
export async function verifySuperAdminTotp(account: TotpAccount, code: string | undefined): Promise<boolean> {
  if (!code || !account.totpSecret) return false;

  try {
    const secret = decryptSecret(account.totpSecret);
    if (verifyTotp(code, secret)) return true;
  } catch {
    return false;
  }

  if (account.totpRecoveryCodes) {
    const hashes = JSON.parse(account.totpRecoveryCodes) as string[];
    const idx = await matchRecoveryCode(code, hashes);
    if (idx >= 0) {
      hashes.splice(idx, 1);
      await prisma.user.update({ where: { id: account.id }, data: { totpRecoveryCodes: JSON.stringify(hashes) } });
      return true;
    }
  }
  return false;
}

/**
 * Verify a code against ANY enrolled super admin — used by the support/admin
 * access gate, where the operator proves they hold an enrolled authenticator
 * (in addition to the access code).
 */
export async function verifyAnySuperAdminTotp(code: string | undefined): Promise<boolean> {
  if (!code) return false;
  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", totpEnabled: true },
    select: { id: true, totpSecret: true, totpRecoveryCodes: true },
  });
  for (const a of admins) {
    if (await verifySuperAdminTotp(a, code)) return true;
  }
  return false;
}
