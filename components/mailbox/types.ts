export type MailboxSource = "DEMO_REQUEST" | "CONTACT";
export type MailboxStatus = "UNREAD" | "READ" | "REPLIED" | "ARCHIVED";

// List/inbox view.
export interface MailboxMessageView {
  id: string;
  source: MailboxSource;
  name: string;
  email: string;
  phone: string | null;
  schoolName: string | null;
  message: string | null;
  status: MailboxStatus;
  createdAt: string;
  replyCount: number;
}

export interface MailboxReplyView {
  id: string;
  body: string;
  sentAt: string;
  sentBy: { name: string };
}

// Detail view — fetched on demand, includes the reply thread.
export interface MailboxMessageDetail extends MailboxMessageView {
  replies: MailboxReplyView[];
}
