import type { AppRole } from "../lib/roles";

// Test logins — these mirror prisma/seed.ts. Run `npm run db:seed` before E2E.
export const SCHOOL_CODE = "SCH001";
export const SCHOOL_PASSWORD = "Admin@123";

export interface Credential {
  role: AppRole;
  schoolCode: string; // "" for super admin
  username: string;
  password: string;
  dashboard: string;
}

export const CREDENTIALS: Credential[] = [
  { role: "SUPER_ADMIN", schoolCode: "", username: "superadmin", password: "admin123", dashboard: "/super-admin/dashboard" },
  { role: "SCHOOL_ADMIN", schoolCode: SCHOOL_CODE, username: "admin@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/school-admin/dashboard" },
  { role: "PRINCIPAL", schoolCode: SCHOOL_CODE, username: "principal@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/principal/dashboard" },
  { role: "TEACHER", schoolCode: SCHOOL_CODE, username: "teacher@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/teacher/dashboard" },
  { role: "STUDENT", schoolCode: SCHOOL_CODE, username: "student@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/student/dashboard" },
  { role: "PARENT", schoolCode: SCHOOL_CODE, username: "parent@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/parent/dashboard" },
  { role: "ACCOUNTANT", schoolCode: SCHOOL_CODE, username: "accountant@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/accountant/dashboard" },
  { role: "LIBRARIAN", schoolCode: SCHOOL_CODE, username: "librarian@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/librarian/dashboard" },
  { role: "TRANSPORT_MANAGER", schoolCode: SCHOOL_CODE, username: "transport@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/transport/dashboard" },
  { role: "HR_MANAGER", schoolCode: SCHOOL_CODE, username: "hr@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/hr/dashboard" },
  { role: "WARDEN_MANAGER", schoolCode: SCHOOL_CODE, username: "warden@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/warden/dashboard" },
  { role: "MESS_MANAGER", schoolCode: SCHOOL_CODE, username: "mess@sch001.com", password: SCHOOL_PASSWORD, dashboard: "/mess/dashboard" },
];

export const byRole = (role: AppRole) => CREDENTIALS.find((c) => c.role === role)!;
