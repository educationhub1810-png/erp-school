import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function MessLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["MESS_MANAGER"]}>{children}</DashboardLayout>;
}
