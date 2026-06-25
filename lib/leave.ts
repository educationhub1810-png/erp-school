// Shared leave-request data used by the apply form and the student/teacher/
// principal leave pages, so labels and the day count stay consistent.

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
  EARNED: "Earned Leave",
  MATERNITY: "Maternity Leave",
  PATERNITY: "Paternity Leave",
  UNPAID: "Unpaid Leave",
  OTHER: "Other",
};

export const LEAVE_TYPES = Object.keys(LEAVE_TYPE_LABELS) as (keyof typeof LEAVE_TYPE_LABELS)[];

// Inclusive day count, e.g. Mon-Mon is 1 day, Mon-Wed is 3 days.
export function daysBetweenInclusive(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay) + 1;
}

// A TEACHER approves STUDENT leave; a PRINCIPAL approves TEACHER leave.
export const LEAVE_APPLICANT_ROLE_FOR_APPROVER: Record<string, string> = {
  TEACHER: "STUDENT",
  PRINCIPAL: "TEACHER",
};
