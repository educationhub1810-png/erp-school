import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplyLeaveDialog } from "@/components/shared/apply-leave-dialog";
import { LEAVE_TYPE_LABELS, daysBetweenInclusive } from "@/lib/leave";
import { CalendarCheck } from "lucide-react";

const statusStyle: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function StudentLeavePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const user = getUser(session);

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: user.id, schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Applications</h1>
          <p className="text-sm text-gray-500 mt-1">Apply for leave and track status</p>
        </div>
        <ApplyLeaveDialog />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" /> My Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarCheck className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No leave applications yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">From</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">To</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Days</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Reason</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{LEAVE_TYPE_LABELS[r.leaveType]}</td>
                    <td className="px-6 py-3 text-gray-500">{new Date(r.fromDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-6 py-3 text-gray-500">{new Date(r.toDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{daysBetweenInclusive(r.fromDate, r.toDate)}</td>
                    <td className="px-6 py-3 text-gray-500 max-w-xs truncate">{r.reason ?? "—"}</td>
                    <td className="px-6 py-3"><Badge className={statusStyle[r.status] ?? ""}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
