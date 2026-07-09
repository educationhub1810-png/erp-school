import { z } from "zod";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { sendDemoRequestEmail } from "@/lib/mailer";
import { clientIp } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(254),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  schoolName: z.string().trim().min(1, "School/institution name is required").max(150),
  message: z.string().trim().max(2000).optional(),
});

// Public "Request a demo" form on the landing page. Pre-auth, no session — see
// OPEN_PATHS in auth.config.ts for the /api/public exemption. Just emails the
// lead to the sales inbox; nothing is persisted since there is no admin UI to
// review submissions.
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
    await sendDemoRequestEmail(parsed.data);
  } catch (e) {
    console.error("[demo-request] failed to send lead email", e, "ip:", clientIp(req));
    return serverError(e);
  }

  return ok({ submitted: true });
}
