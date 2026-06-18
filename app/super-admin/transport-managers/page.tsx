import { StaffManagement } from "../_staff/staff-management";

interface Props {
  searchParams: Promise<{ schoolId?: string; search?: string; page?: string }>;
}

export default function TransportManagersPage({ searchParams }: Props) {
  return <StaffManagement role="TRANSPORT_MANAGER" roleLabel="Transport Manager" roleLabelPlural="Transport Managers" searchParams={searchParams} />;
}
