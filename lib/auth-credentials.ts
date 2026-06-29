import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/roles";
import { OTP_MAX_ATTEMPTS, verifyOtp } from "@/lib/otp";

export type AuthorizedUser = {
  id: string;
  name: string;
  email?: string;
  role: AppRole;
  schoolId?: string;
  isImpersonating?: boolean;
};

export function dobToPassword(dob: Date): string {
  const d = String(dob.getUTCDate()).padStart(2, "0");
  const m = String(dob.getUTCMonth() + 1).padStart(2, "0");
  const y = String(dob.getUTCFullYear());
  return `${d}${m}${y}`;
}

// A throwaway bcrypt hash used to equalize timing on failed logins, so an
// attacker cannot distinguish "user/student exists" from "does not exist" by
// measuring whether a bcrypt comparison ran. (Mitigates account enumeration.)
const DUMMY_HASH = bcrypt.hashSync("nonexistent-account-placeholder", 12);

// Resolve a username/password (+ selected role) to an account, WITHOUT applying
// any second factor. Shared by NextAuth's authorize() and the OTP-request route
// so the five login paths live in exactly one place.
//
// No school is collected on the login form — student codes and emails are
// globally unique, so the account is resolved by username alone. The user picks
// their role on the form and we enforce it against the account below.
export async function resolveCredentials(creds: {
  role?: string;
  username?: string;
  password?: string;
}): Promise<AuthorizedUser | null> {
  const { role, username, password } = creds;
  if (!username || !password || !role) return null;

  let candidate: AuthorizedUser | null = null;

  // 1. Student path — username = studentCode (global), password = DOB (DDMMYYYY)
  const student = await prisma.student.findFirst({
    where: { studentCode: username },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });
  if (student && student.user.isActive && student.dob && password === dobToPassword(student.dob)) {
    candidate = {
      id: student.user.id,
      name: student.user.name,
      email: student.user.email ?? undefined,
      role: student.user.role as AppRole,
      schoolId: student.schoolId ?? undefined,
    };
  }

  // 2. Principal path — username = Staff.employeeId, password = DOB (DDMMYYYY).
  // Mirrors the student path: these accounts may have no email/mobile on file
  // at all, so path 5 below can never resolve them.
  if (!candidate) {
    const staff = await prisma.staff.findFirst({
      where: { employeeId: username },
      include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
    });
    if (staff && staff.user.isActive && staff.dob && password === dobToPassword(staff.dob)) {
      candidate = {
        id: staff.user.id,
        name: staff.user.name,
        email: staff.user.email ?? undefined,
        role: staff.user.role as AppRole,
        schoolId: staff.schoolId ?? undefined,
      };
    }
  }

  // 3. Teacher path — username = Teacher.employeeId, password = DOB (DDMMYYYY).
  if (!candidate) {
    const teacher = await prisma.teacher.findFirst({
      where: { employeeId: username },
      include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
    });
    if (teacher && teacher.user.isActive && teacher.dob && password === dobToPassword(teacher.dob)) {
      candidate = {
        id: teacher.user.id,
        name: teacher.user.name,
        email: teacher.user.email ?? undefined,
        role: teacher.user.role as AppRole,
        schoolId: teacher.schoolId ?? undefined,
      };
    }
  }

  // 4. Parent path — username = ParentProfile.parentCode, password = DOB (DDMMYYYY).
  if (!candidate) {
    const parent = await prisma.parentProfile.findFirst({
      where: { parentCode: username },
      include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
    });
    if (parent && parent.user.isActive && parent.dob && password === dobToPassword(parent.dob)) {
      candidate = {
        id: parent.user.id,
        name: parent.user.name,
        email: parent.user.email ?? undefined,
        role: parent.user.role as AppRole,
        schoolId: parent.schoolId ?? undefined,
      };
    }
  }

  // 5. Everyone else (and the above roles when they log in with an email/mobile
  // and their real password instead) — email/mobile + bcrypt
  if (!candidate) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: username }, { mobile: username }], isActive: true },
    });
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH); // equalize timing
      return null;
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    candidate = {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      role: user.role as AppRole,
      schoolId: user.schoolId ?? undefined,
    };
  }

  // Enforce the role the user selected on the form against their real account
  // role — a mismatch is treated as a failed login.
  if (candidate.role !== role) return null;

  return candidate;
}

// Verify a login OTP for a user and consume it on success. Looks at the newest
// un-consumed code only; expired, over-attempt, or mismatched codes fail. Each
// call burns one attempt so a stolen code can be guessed only OTP_MAX_ATTEMPTS
// times before the row is useless.
export async function verifyAndConsumeOtp(userId: string, code: string): Promise<boolean> {
  if (!code) return false;
  const otp = await prisma.loginOtp.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;
  if (otp.expiresAt.getTime() < Date.now()) return false;
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return false;

  await prisma.loginOtp.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 } },
  });

  const valid = await verifyOtp(code, otp.codeHash);
  if (!valid) return false;

  await prisma.loginOtp.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });
  return true;
}
