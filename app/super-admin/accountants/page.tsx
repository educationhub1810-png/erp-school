import { StaffManagement } from "../_staff/staff-management";

interface Props {
  searchParams: Promise<{ schoolId?: string; search?: string; page?: string }>;
}

export default function AccountantsPage({ searchParams }: Props) {
  return <StaffManagement role="ACCOUNTANT" roleLabel="Accountant" roleLabelPlural="Accountants" searchParams={searchParams} />;
}
