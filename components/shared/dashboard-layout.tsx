import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ROLE_DASHBOARDS } from "@/lib/constants";
import type { AppRole as Role } from "@/lib/roles";

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

  const userRole = session.user.role as Role;

  if (!allowedRoles.includes(userRole)) {
    redirect(ROLE_DASHBOARDS[userRole]);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={userRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={{
            name: session.user.name,
            email: session.user.email,
            role: userRole,
          }}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
