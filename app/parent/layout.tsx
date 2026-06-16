import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["PARENT"]}>{children}</DashboardLayout>;
}
