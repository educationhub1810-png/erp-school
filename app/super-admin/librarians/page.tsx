import { StaffManagement } from "../_staff/staff-management";

interface Props {
  searchParams: Promise<{ schoolId?: string; search?: string; page?: string }>;
}

export default function LibrariansPage({ searchParams }: Props) {
  return <StaffManagement role="LIBRARIAN" roleLabel="Librarian" roleLabelPlural="Librarians" searchParams={searchParams} />;
}
