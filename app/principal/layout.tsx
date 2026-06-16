import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["PRINCIPAL"]}>{children}</DashboardLayout>;
}
