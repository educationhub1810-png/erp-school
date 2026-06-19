import { auth } from "@/auth";
import { getUser } from "@/lib/session";
import { getBugTicketsForUser } from "@/lib/bug-tickets";
import { BugBoard } from "@/components/bugs/bug-board";

export default async function SchoolAdminBugsPage() {
  const session = await auth();
  const user = getUser(session!);
  const tickets = await getBugTicketsForUser(user);

  return <BugBoard initialTickets={tickets} role={user.role} currentUserId={user.id} />;
}
