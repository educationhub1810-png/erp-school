export type StaffRole = "PRINCIPAL" | "ACCOUNTANT" | "LIBRARIAN" | "TRANSPORT_MANAGER" | "HR_MANAGER" | "WARDEN_MANAGER";

export interface RoleField {
  key: "qualification" | "experienceYears" | "licenseNumber" | "vehicleNumber" | "assignedBlock" | "department" | "designation";
  label: string;
  placeholder?: string;
  type?: "text" | "number";
}

export const ROLE_FIELDS: Record<StaffRole, RoleField[]> = {
  PRINCIPAL: [
    { key: "qualification", label: "Qualification", placeholder: "M.Ed, Ph.D" },
    { key: "experienceYears", label: "Experience (Years)", type: "number" },
    { key: "designation", label: "Designation", placeholder: "Principal" },
  ],
  ACCOUNTANT: [
    { key: "qualification", label: "Qualification", placeholder: "B.Com, CA" },
    { key: "experienceYears", label: "Experience (Years)", type: "number" },
    { key: "department", label: "Department", placeholder: "Finance & Accounts" },
  ],
  LIBRARIAN: [
    { key: "qualification", label: "Qualification", placeholder: "B.Lib, M.Lib" },
    { key: "experienceYears", label: "Experience (Years)", type: "number" },
    { key: "department", label: "Department", placeholder: "Library" },
  ],
  TRANSPORT_MANAGER: [
    { key: "licenseNumber", label: "License Number", placeholder: "DL-1234567890" },
    { key: "vehicleNumber", label: "Vehicle Number", placeholder: "MH12AB1234" },
    { key: "experienceYears", label: "Experience (Years)", type: "number" },
  ],
  HR_MANAGER: [
    { key: "qualification", label: "Qualification", placeholder: "MBA HR" },
    { key: "experienceYears", label: "Experience (Years)", type: "number" },
    { key: "department", label: "Department", placeholder: "Human Resources" },
  ],
  WARDEN_MANAGER: [
    { key: "assignedBlock", label: "Assigned Hostel/Block", placeholder: "Block A" },
    { key: "experienceYears", label: "Experience (Years)", type: "number" },
    { key: "department", label: "Department", placeholder: "Hostel" },
  ],
};
