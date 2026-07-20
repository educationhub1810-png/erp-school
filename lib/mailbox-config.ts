// Mailbox configuration — no Prisma/server deps, safe to import anywhere

export const MAILBOX_SOURCES = ["DEMO_REQUEST", "CONTACT"] as const;
export type MailboxSource = (typeof MAILBOX_SOURCES)[number];

export const MAILBOX_STATUSES = ["UNREAD", "READ", "REPLIED", "ARCHIVED"] as const;
export type MailboxStatus = (typeof MAILBOX_STATUSES)[number];

export const MAILBOX_SOURCE_LABELS: Record<MailboxSource, string> = {
  DEMO_REQUEST: "Demo Request",
  CONTACT: "Contact",
};

export const MAILBOX_SOURCE_BADGE: Record<MailboxSource, string> = {
  DEMO_REQUEST: "bg-indigo-100 text-indigo-700",
  CONTACT: "bg-teal-100 text-teal-700",
};

export const MAILBOX_STATUS_LABELS: Record<MailboxStatus, string> = {
  UNREAD: "Unread",
  READ: "Read",
  REPLIED: "Replied",
  ARCHIVED: "Archived",
};

export const MAILBOX_STATUS_BADGE: Record<MailboxStatus, string> = {
  UNREAD: "bg-blue-100 text-blue-700",
  READ: "bg-gray-100 text-gray-600",
  REPLIED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};
