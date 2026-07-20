import { requireAuth } from "@/lib/auth-guard";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { getMailboxMessages } from "@/lib/mailbox";

export async function GET() {
  const { error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  try {
    const messages = await getMailboxMessages();
    return ok({ messages });
  } catch (e) {
    return serverError(e);
  }
}
