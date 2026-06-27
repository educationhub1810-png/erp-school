// Role definitions — no Prisma dependency, safe for Edge Runtime

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  PRINCIPAL: "PRINCIPAL",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  PARENT: "PARENT",
  ACCOUNTANT: "ACCOUNTANT",
  LIBRARIAN: "LIBRARIAN",
  TRANSPORT_MANAGER: "TRANSPORT_MANAGER",
  HR_MANAGER: "HR_MANAGER",
  WARDEN_MANAGER: "WARDEN_MANAGER",
  MESS_MANAGER: "MESS_MANAGER",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_DASHBOARDS: Record<AppRole, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  SCHOOL_ADMIN: "/school-admin/dashboard",
  PRINCIPAL: "/principal/dashboard",
  TEACHER: "/teacher/dashboard",
  STUDENT: "/student/dashboard",
  PARENT: "/parent/dashboard",
  ACCOUNTANT: "/accountant/dashboard",
  LIBRARIAN: "/librarian/dashboard",
  TRANSPORT_MANAGER: "/transport/dashboard",
  HR_MANAGER: "/hr/dashboard",
  WARDEN_MANAGER: "/warden/dashboard",
  MESS_MANAGER: "/mess/dashboard",
};

export const ROLE_PROFILE_PATHS: Record<AppRole, string> = {
  SUPER_ADMIN: "/super-admin/profile",
  SCHOOL_ADMIN: "/school-admin/profile",
  PRINCIPAL: "/principal/profile",
  TEACHER: "/teacher/profile",
  STUDENT: "/student/profile",
  PARENT: "/parent/profile",
  ACCOUNTANT: "/accountant/profile",
  LIBRARIAN: "/librarian/profile",
  TRANSPORT_MANAGER: "/transport/profile",
  HR_MANAGER: "/hr/profile",
  WARDEN_MANAGER: "/warden/profile",
  MESS_MANAGER: "/mess/profile",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "School Admin",
  PRINCIPAL: "Principal",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Parent",
  ACCOUNTANT: "Accountant",
  LIBRARIAN: "Librarian",
  TRANSPORT_MANAGER: "Transport Manager",
  HR_MANAGER: "HR Manager",
  WARDEN_MANAGER: "Warden Manager",
  MESS_MANAGER: "Mess Manager",
};

export const ROLE_ALLOWED_PREFIXES: Record<AppRole, string[]> = {
  SUPER_ADMIN: ["/super-admin"],
  SCHOOL_ADMIN: ["/school-admin"],
  PRINCIPAL: ["/principal"],
  TEACHER: ["/teacher"],
  STUDENT: ["/student"],
  PARENT: ["/parent"],
  ACCOUNTANT: ["/accountant"],
  LIBRARIAN: ["/librarian"],
  TRANSPORT_MANAGER: ["/transport"],
  HR_MANAGER: ["/hr"],
  WARDEN_MANAGER: ["/warden"],
  MESS_MANAGER: ["/mess"],
};

// Staff roles whose login password is their date of birth (DDMMYYYY), set at
// account creation instead of a fixed default — these accounts are looked up
// by Staff.employeeId at login, not email/mobile, since they're admin-created
// in bulk and may never get a real email/mobile on file.
export const DOB_PASSWORD_STAFF_ROLES: AppRole[] = ["PRINCIPAL"];
