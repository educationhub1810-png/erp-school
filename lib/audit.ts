import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGIN_2FA_FAILURE"
  | "OTP_SENT"
  | "TWO_FACTOR_POLICY_UPDATE"
  | "LOGOUT"
  | "ADMIN_ACCESS_GRANTED"
  | "ADMIN_ACCESS_DENIED"
  | "IMPERSONATE_TOKEN_ISSUED"
  | "ACCOUNT_ACTIVATE"
  | "ACCOUNT_DEACTIVATE"
  | "USER_CREATE"
  | "USER_DELETE"
  | "USER_PASSWORD_RESET"
  | "SCHOOL_CREATE"
  | "SCHOOL_ACTIVATE"
  | "SCHOOL_DEACTIVATE"
  | "SCHOOL_DELETE"
  | "STUDENT_DELETE"
  | "TEACHER_DELETE"
  | "STAFF_DELETE"
  | "PARENT_DELETE"
  | "BUG_DELETE";

export interface AuditEntry {
  action: AuditAction;
  actorId?: string | null;
  actorRole?: string | null;
  schoolId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

// Best-effort security audit log. Never throws — a logging failure must not
// break the operation being audited.
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? null,
        schoolId: entry.schoolId ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ip: entry.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write audit log", e);
  }
}

// Audit an account being enabled/disabled. No-op unless the active flag
// actually flipped, so a PUT that merely re-sends the same value is not logged.
export async function auditAccountStatusChange(opts: {
  prev: boolean | null | undefined;
  next: boolean | undefined;
  actor: { id: string; role: string };
  targetUserId: string;
  targetType: string;
  schoolId?: string | null;
  ip?: string | null;
}): Promise<void> {
  if (opts.next === undefined || opts.prev == null || opts.prev === opts.next) return;
  await writeAuditLog({
    action: opts.next ? "ACCOUNT_ACTIVATE" : "ACCOUNT_DEACTIVATE",
    actorId: opts.actor.id,
    actorRole: opts.actor.role,
    schoolId: opts.schoolId ?? null,
    targetType: opts.targetType,
    targetId: opts.targetUserId,
    ip: opts.ip,
  });
}

// Extract the client IP from request headers (behind a proxy/edge).
export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
