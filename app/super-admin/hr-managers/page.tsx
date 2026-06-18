import { StaffManagement } from "../_staff/staff-management";

interface Props {
  searchParams: Promise<{ schoolId?: string; search?: string; page?: string }>;
}

export default function HRManagersPage({ searchParams }: Props) {
  return <StaffManagement role="HR_MANAGER" roleLabel="HR Manager" roleLabelPlural="HR Managers" searchParams={searchParams} />;
}
