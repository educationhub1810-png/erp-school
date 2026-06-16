import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["SUPER_ADMIN"]}>{children}</DashboardLayout>;
}
