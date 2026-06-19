import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import type { BugTicketView } from "@/components/bugs/types";
import type { BugStatus, BugPriority } from "@/lib/bug-config";

// School-scoped where clause: Super Admin sees all; other roles see only their own school's.
export function bugScopeWhere(user: SessionUser) {
  return user.role === "SUPER_ADMIN" ? {} : { schoolId: user.schoolId ?? "__none__" };
}

// List/board fetch. Deliberately omits the base64 screenshotUrl blob from both
// the DB read and the response — the board only needs to know whether a
// screenshot exists; the image itself is loaded on demand via the detail route.
export async function getBugTicketsForUser(user: SessionUser): Promise<BugTicketView[]> {
  const where = bugScopeWhere(user);

  const [tickets, withScreenshots] = await Promise.all([
    prisma.bugTicket.findMany({
      where,
      select: {
        id: true,
        schoolId: true,
        reporterId: true,
        title: true,
        description: true,
        whatNotWorking: true,
        whatExpected: true,
        status: true,
        priority: true,
        createdAt: true,
        school: { select: { name: true, code: true } },
        reporter: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bugTicket.findMany({
      where: { ...where, NOT: { screenshotUrl: null } },
      select: { id: true },
    }),
  ]);

  const screenshotIds = new Set(withScreenshots.map((t) => t.id));

  return tickets.map((t) => ({
    id: t.id,
    schoolId: t.schoolId,
    reporterId: t.reporterId,
    title: t.title,
    description: t.description,
    whatNotWorking: t.whatNotWorking,
    whatExpected: t.whatExpected,
    hasScreenshot: screenshotIds.has(t.id),
    status: t.status as BugStatus,
    priority: t.priority as BugPriority,
    createdAt: t.createdAt.toISOString(),
    school: t.school,
    reporter: t.reporter,
  }));
}
