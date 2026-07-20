import { z } from "zod";
import { created, badRequest, serverError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(254),
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

// Public "Contact us" form on the landing page. Pre-auth, no session — see
// OPEN_PATHS in auth.config.ts for the /api/public exemption. Lands in the
// in-app mailbox for Super Admin review (see app/super-admin/mailbox).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  try {
    await prisma.mailboxMessage.create({
      data: { source: "CONTACT", schoolName: null, ...parsed.data },
    });
  } catch (e) {
    return serverError(e);
  }

  return created({ submitted: true });
}
