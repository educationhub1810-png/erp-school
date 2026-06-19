import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import type { BugTicketView } from "@/components/bugs/types";
import type { BugStatus, BugPriority } from "@/lib/bug-config";

// School-scoped fetch: Super Admin sees all tickets; other roles see only their own school's.
export async function getBugTicketsForUser(user: SessionUser): Promise<BugTicketView[]> {
  const where = user.role === "SUPER_ADMIN" ? {} : { schoolId: user.schoolId ?? "__none__" };

  const tickets = await prisma.bugTicket.findMany({
    where,
    include: {
      school: { select: { name: true, code: true } },
      reporter: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return tickets.map((t) => ({
    id: t.id,
    schoolId: t.schoolId,
    reporterId: t.reporterId,
    title: t.title,
    description: t.description,
    whatNotWorking: t.whatNotWorking,
    whatExpected: t.whatExpected,
    screenshotUrl: t.screenshotUrl,
    status: t.status as BugStatus,
    priority: t.priority as BugPriority,
    createdAt: t.createdAt.toISOString(),
    school: t.school,
    reporter: t.reporter,
  }));
}
