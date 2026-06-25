import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/roles";

export interface ProfileDetail {
  label: string;
  value: string;
}

export interface ProfileData {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  role: AppRole;
  isActive: boolean;
  createdAt: Date;
  totpEnabled: boolean;
  schoolName: string | null;
  schoolCode: string | null;
  photoUrl: string | null;
  details: ProfileDetail[];
}

const GENDER_LABELS: Record<string, string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };

function fmtDate(d: Date | null | undefined): string {
  return d ? new Date(d).toLocaleDateString("en-IN") : "—";
}

function fmtGender(g: string | null | undefined): string {
  return g ? GENDER_LABELS[g] ?? g : "—";
}

/** Fetches a normalized, display-ready profile for any role — the base
 * `User` fields plus whichever role-specific record (Student / Teacher /
 * ParentProfile / Staff) the account has, if any. Admin roles (Super Admin,
 * School Admin) have no extended record, so `details` is empty for them. */
export async function getProfileData(userId: string, role: AppRole): Promise<ProfileData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { school: { select: { name: true, code: true } } },
  });
  if (!user) return null;

  const data: ProfileData = {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role as AppRole,
    isActive: user.isActive,
    createdAt: user.createdAt,
    totpEnabled: user.totpEnabled,
    schoolName: user.school?.name ?? null,
    schoolCode: user.school?.code ?? null,
    photoUrl: null,
    details: [],
  };

  if (role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: { class: { select: { name: true } }, section: { select: { name: true } } },
    });
    if (student) {
      data.photoUrl = student.photoUrl;
      data.details = [
        { label: "Student Code", value: student.studentCode },
        { label: "Roll Number", value: student.rollNumber ?? "—" },
        { label: "Class", value: student.class?.name ?? "—" },
        { label: "Section", value: student.section?.name ?? "—" },
        { label: "Gender", value: fmtGender(student.gender) },
        { label: "Date of Birth", value: fmtDate(student.dob) },
        { label: "Blood Group", value: student.bloodGroup ?? "—" },
        { label: "House", value: student.house ?? "—" },
        { label: "Admission Date", value: fmtDate(student.admissionDate) },
      ];
    }
  } else if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (teacher) {
      data.photoUrl = teacher.photoUrl;
      data.details = [
        { label: "Employee ID", value: teacher.employeeId },
        { label: "Gender", value: fmtGender(teacher.gender) },
        { label: "Date of Birth", value: fmtDate(teacher.dob) },
        { label: "Qualification", value: teacher.qualification ?? "—" },
        { label: "Specialization", value: teacher.specialization ?? "—" },
        { label: "Experience", value: teacher.experienceYears != null ? `${teacher.experienceYears} years` : "—" },
        { label: "Joining Date", value: fmtDate(teacher.joiningDate) },
      ];
    }
  } else if (role === "PARENT") {
    const parent = await prisma.parentProfile.findUnique({ where: { userId } });
    if (parent) {
      data.details = [
        { label: "Parent Code", value: parent.parentCode },
        { label: "Relation", value: parent.parentType },
        { label: "Gender", value: fmtGender(parent.gender) },
        { label: "Date of Birth", value: fmtDate(parent.dob) },
        { label: "Marital Status", value: parent.maritalStatus ?? "—" },
        { label: "Address", value: parent.address ?? "—" },
      ];
    }
  } else if (role !== "SUPER_ADMIN" && role !== "SCHOOL_ADMIN") {
    // Staff-backed roles: Principal, Accountant, Librarian, Transport Manager, HR Manager, Warden Manager, Mess Manager
    const staff = await prisma.staff.findUnique({ where: { userId } });
    if (staff) {
      data.details = [
        { label: "Employee ID", value: staff.employeeId },
        { label: "Department", value: staff.department ?? "—" },
        { label: "Designation", value: staff.designation ?? "—" },
        { label: "Date of Birth", value: fmtDate(staff.dob) },
        { label: "Qualification", value: staff.qualification ?? "—" },
        { label: "Experience", value: staff.experienceYears != null ? `${staff.experienceYears} years` : "—" },
        { label: "Joining Date", value: fmtDate(staff.joiningDate) },
      ];
    }
  }

  return data;
}
