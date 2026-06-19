import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "IMPERSONATE_TOKEN_ISSUED"
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

// Extract the client IP from request headers (behind a proxy/edge).
export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
