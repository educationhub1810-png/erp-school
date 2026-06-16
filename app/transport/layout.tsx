import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function TransportLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["TRANSPORT_MANAGER"]}>{children}</DashboardLayout>;
}
