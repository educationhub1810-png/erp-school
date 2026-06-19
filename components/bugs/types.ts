import type { BugStatus, BugPriority } from "@/lib/bug-config";

export interface BugTicketView {
  id: string;
  schoolId: string | null;
  reporterId: string;
  title: string;
  description: string;
  whatNotWorking: string;
  whatExpected: string;
  screenshotUrl: string | null;
  status: BugStatus;
  priority: BugPriority;
  createdAt: string;
  school: { name: string; code: string } | null;
  reporter: { name: string; role: string };
}
