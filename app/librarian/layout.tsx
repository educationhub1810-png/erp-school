import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["LIBRARIAN"]}>{children}</DashboardLayout>;
}
