import { prisma } from "@/lib/prisma";
import type { MailboxMessageView, MailboxMessageDetail } from "@/components/mailbox/types";

const listSelect = {
  id: true,
  source: true,
  name: true,
  email: true,
  phone: true,
  schoolName: true,
  message: true,
  status: true,
  createdAt: true,
  _count: { select: { replies: true } },
} as const;

export async function getMailboxMessages(): Promise<MailboxMessageView[]> {
  const messages = await prisma.mailboxMessage.findMany({
    select: listSelect,
    orderBy: { createdAt: "desc" },
  });

  return messages.map((m) => ({
    id: m.id,
    source: m.source,
    name: m.name,
    email: m.email,
    phone: m.phone,
    schoolName: m.schoolName,
    message: m.message,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    replyCount: m._count.replies,
  }));
}

export async function getMailboxMessageDetail(id: string): Promise<MailboxMessageDetail | null> {
  const message = await prisma.mailboxMessage.findUnique({
    where: { id },
    include: {
      replies: {
        orderBy: { sentAt: "asc" },
        include: { sentBy: { select: { name: true } } },
      },
    },
  });
  if (!message) return null;

  return {
    id: message.id,
    source: message.source,
    name: message.name,
    email: message.email,
    phone: message.phone,
    schoolName: message.schoolName,
    message: message.message,
    status: message.status,
    createdAt: message.createdAt.toISOString(),
    replyCount: message.replies.length,
    replies: message.replies.map((r) => ({
      id: r.id,
      body: r.body,
      sentAt: r.sentAt.toISOString(),
      sentBy: { name: r.sentBy.name },
    })),
  };
}
