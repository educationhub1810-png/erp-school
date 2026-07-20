import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { created, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { getMailboxMessageDetail } from "@/lib/mailbox";
import { sendMailboxReplyEmail } from "@/lib/mailer";
import { z } from "zod";

const replySchema = z.object({
  body: z.string().trim().min(1, "Reply cannot be empty").max(5000),
});

// Sends an outbound reply email to the sender and records it on the thread.
// No inbound sync — this is one-way, from the app to the sender's address.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const message = await prisma.mailboxMessage.findUnique({ where: { id } });
    if (!message) return notFound("Message not found");

    try {
      await sendMailboxReplyEmail({ to: message.email, name: message.name, body: parsed.data.body });
    } catch (e) {
      return serverError(e);
    }

    await prisma.$transaction([
      prisma.mailboxReply.create({
        data: { messageId: id, body: parsed.data.body, sentById: user.id },
      }),
      prisma.mailboxMessage.update({
        where: { id },
        data: { status: "REPLIED" },
      }),
    ]);

    const detail = await getMailboxMessageDetail(id);
    return created(detail);
  } catch (e) {
    return serverError(e);
  }
}
