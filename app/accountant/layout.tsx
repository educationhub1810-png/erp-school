import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["ACCOUNTANT"]}>{children}</DashboardLayout>;
}
