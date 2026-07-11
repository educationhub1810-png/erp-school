import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { DashboardShell } from "./dashboard-shell";
import { ImpersonationBanner } from "./impersonation-banner";
import { ROLE_DASHBOARDS } from "@/lib/constants";
import { ROLE_LABELS, type AppRole as Role } from "@/lib/roles";

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export async function DashboardLayout({
  children,
  allowedRoles,
}: DashboardLayoutProps) {
  const session = await auth();

  if (!session) redirect("/login");

  const sessionUser = getUser(session);
  const userRole = sessionUser.role as Role;
  const isImpersonating = (session.user as { isImpersonating?: boolean }).isImpersonating ?? false;

  if (!allowedRoles.includes(userRole)) {
    redirect(ROLE_DASHBOARDS[userRole]);
  }

  const school = sessionUser.schoolId
    ? await prisma.school.findUnique({
        where: { id: sessionUser.schoolId },
        select: { name: true, logo: true },
      }).catch(() => null)
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {isImpersonating && (
        <ImpersonationBanner
          userName={session.user.name}
          userRole={ROLE_LABELS[userRole]}
        />
      )}
      <DashboardShell
        role={userRole}
        user={{
          name: session.user.name,
          email: session.user.email,
          role: userRole,
        }}
        school={school ? { name: school.name, logo: school.logo ?? null } : null}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
