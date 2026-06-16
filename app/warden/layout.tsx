import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function WardenLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["WARDEN_MANAGER"]}>{children}</DashboardLayout>;
}
