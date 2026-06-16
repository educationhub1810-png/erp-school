import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={["SCHOOL_ADMIN"]}>{children}</DashboardLayout>;
}
