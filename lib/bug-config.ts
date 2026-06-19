// Bug tracker board configuration — no Prisma/server deps, safe to import anywhere

export const BUG_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const BUG_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type BugPriority = (typeof BUG_PRIORITIES)[number];

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

// Tailwind classes for the column header accent of each status
export const BUG_STATUS_ACCENT: Record<BugStatus, string> = {
  OPEN: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  RESOLVED: "bg-green-500",
  CLOSED: "bg-gray-300",
};

export const BUG_PRIORITY_LABELS: Record<BugPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const BUG_PRIORITY_BADGE: Record<BugPriority, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

// Max screenshot size as a base64 data-URL string. ~2.6M chars ≈ a 2 MB image.
export const BUG_SCREENSHOT_MAX_CHARS = 2_700_000;
export const BUG_SCREENSHOT_MAX_BYTES = 2 * 1024 * 1024;
