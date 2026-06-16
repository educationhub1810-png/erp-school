import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["HR_MANAGER"]}>{children}</DashboardLayout>;
}
