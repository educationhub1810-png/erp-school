// Presentation metadata for audit log actions. Kept free of server-only
// imports (no prisma) so client components can use it too.

export type AuditCategory = "AUTH" | "SECURITY" | "DATA";

export interface AuditActionMeta {
  label: string;
  category: AuditCategory;
  /** Tailwind classes for a badge: bg + text. */
  badge: string;
}

export const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
  LOGIN_SUCCESS: { label: "Login", category: "AUTH", badge: "bg-green-100 text-green-700" },
  LOGIN_FAILURE: { label: "Failed login", category: "AUTH", badge: "bg-red-100 text-red-700" },
  IMPERSONATE_TOKEN_ISSUED: { label: "Impersonation", category: "SECURITY", badge: "bg-amber-100 text-amber-700" },
  STUDENT_DELETE: { label: "Student deleted", category: "DATA", badge: "bg-orange-100 text-orange-700" },
  TEACHER_DELETE: { label: "Teacher deleted", category: "DATA", badge: "bg-orange-100 text-orange-700" },
  STAFF_DELETE: { label: "Staff deleted", category: "DATA", badge: "bg-orange-100 text-orange-700" },
  PARENT_DELETE: { label: "Parent deleted", category: "DATA", badge: "bg-orange-100 text-orange-700" },
  BUG_DELETE: { label: "Bug ticket deleted", category: "DATA", badge: "bg-orange-100 text-orange-700" },
};

export function actionMeta(action: string): AuditActionMeta {
  return (
    AUDIT_ACTION_META[action] ?? {
      label: action.replace(/_/g, " ").toLowerCase(),
      category: "SECURITY",
      badge: "bg-gray-100 text-gray-600",
    }
  );
}

// Actions surfaced as the filter chips on the audit page (in display order).
export const AUDIT_FILTERABLE_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "IMPERSONATE_TOKEN_ISSUED",
  "STUDENT_DELETE",
  "TEACHER_DELETE",
  "STAFF_DELETE",
  "PARENT_DELETE",
  "BUG_DELETE",
] as const;
