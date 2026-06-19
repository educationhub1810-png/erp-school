import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { BUG_SCREENSHOT_MAX_CHARS } from "@/lib/bug-config";
import { getBugTicketsForUser } from "@/lib/bug-tickets";
import { imageDataUrl } from "@/lib/validation";
import { z } from "zod";

const BOARD_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"] as const;

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().min(1, "Description is required"),
  whatNotWorking: z.string().min(1, "Please describe what is not working"),
  whatExpected: z.string().min(1, "Please describe what you expected"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  screenshotUrl: imageDataUrl(BUG_SCREENSHOT_MAX_CHARS),
});

export async function GET() {
  const { session, error } = await requireAuth([...BOARD_ROLES]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);

  try {
    const tickets = await getBugTicketsForUser(user);
    return ok({ tickets });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth([...BOARD_ROLES]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  const user = getUser(session!);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const data = parsed.data;

    const ticket = await prisma.bugTicket.create({
      data: {
        schoolId: user.schoolId ?? null,
        reporterId: user.id,
        title: data.title,
        description: data.description,
        whatNotWorking: data.whatNotWorking,
        whatExpected: data.whatExpected,
        priority: data.priority ?? "MEDIUM",
        screenshotUrl: data.screenshotUrl || null,
      },
      include: {
        school: { select: { name: true, code: true } },
        reporter: { select: { name: true, role: true } },
      },
    });

    // Return the list-view shape (no blob) so the board can append it directly.
    const { screenshotUrl, ...rest } = ticket;
    return created({ ...rest, createdAt: ticket.createdAt.toISOString(), hasScreenshot: !!screenshotUrl });
  } catch (e) {
    return serverError(e);
  }
}
