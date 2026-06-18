import { StaffManagement } from "../_staff/staff-management";

interface Props {
  searchParams: Promise<{ schoolId?: string; search?: string; page?: string }>;
}

export default function PrincipalsPage({ searchParams }: Props) {
  return <StaffManagement role="PRINCIPAL" roleLabel="Principal" roleLabelPlural="Principals" searchParams={searchParams} />;
}
