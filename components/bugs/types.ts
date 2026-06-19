import type { BugStatus, BugPriority } from "@/lib/bug-config";

// List/board view — excludes the heavy base64 screenshot blob.
export interface BugTicketView {
  id: string;
  schoolId: string | null;
  reporterId: string;
  title: string;
  description: string;
  whatNotWorking: string;
  whatExpected: string;
  hasScreenshot: boolean;
  status: BugStatus;
  priority: BugPriority;
  createdAt: string;
  school: { name: string; code: string } | null;
  reporter: { name: string; role: string };
}

// Detail view — fetched on demand, includes the screenshot data URL.
export interface BugTicketDetail extends BugTicketView {
  screenshotUrl: string | null;
}
