"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { AppRole as Role } from "@/lib/roles";

interface Props {
  role: Role;
  user: { name: string; email?: string; role: Role };
  school: { name: string; logo: string | null } | null;
  children: React.ReactNode;
}

/** Owns the mobile sidebar-drawer open/close state shared between the
 * Header's hamburger trigger and the Sidebar's off-canvas drawer — lifted
 * here since DashboardLayout itself is a server component. */
export function DashboardShell({ role, user, school, children }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar role={role} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} school={school} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
