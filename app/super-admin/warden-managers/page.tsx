import { StaffManagement } from "../_staff/staff-management";

interface Props {
  searchParams: Promise<{ schoolId?: string; search?: string; page?: string }>;
}

export default function WardenManagersPage({ searchParams }: Props) {
  return <StaffManagement role="WARDEN_MANAGER" roleLabel="Warden Manager" roleLabelPlural="Warden Managers" searchParams={searchParams} />;
}
