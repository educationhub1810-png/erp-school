import { getMailboxMessages } from "@/lib/mailbox";
import { MailboxInbox } from "@/components/mailbox/mailbox-inbox";

export default async function SuperAdminMailboxPage() {
  const messages = await getMailboxMessages();

  return <MailboxInbox initialMessages={messages} />;
}
