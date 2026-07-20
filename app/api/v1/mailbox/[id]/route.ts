import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api-response";
import { getMailboxMessageDetail } from "@/lib/mailbox";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["UNREAD", "READ", "ARCHIVED"]),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;

  try {
    const message = await getMailboxMessageDetail(id);
    if (!message) return notFound("Message not found");
    return ok(message);
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const existing = await prisma.mailboxMessage.findUnique({ where: { id } });
    if (!existing) return notFound("Message not found");

    await prisma.mailboxMessage.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    const message = await getMailboxMessageDetail(id);
    return ok(message);
  } catch (e) {
    return serverError(e);
  }
}
