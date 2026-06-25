import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeaveDecisionButtons } from "@/components/shared/leave-decision-buttons";
import { LEAVE_TYPE_LABELS, daysBetweenInclusive } from "@/lib/leave";
import { ClipboardCheck } from "lucide-react";

const statusStyle: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function PrincipalLeavesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const user = getUser(session);

  const teacherRequests = await prisma.leaveRequest.findMany({
    where: { schoolId: user.schoolId, user: { role: "TEACHER" } },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Review and decide teacher leave requests</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" /> Teacher Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {teacherRequests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No teacher leave requests.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Teacher</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">From</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">To</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Days</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Reason</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teacherRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{r.user.name}</td>
                    <td className="px-6 py-3 text-gray-500">{LEAVE_TYPE_LABELS[r.leaveType]}</td>
                    <td className="px-6 py-3 text-gray-500">{new Date(r.fromDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-6 py-3 text-gray-500">{new Date(r.toDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{daysBetweenInclusive(r.fromDate, r.toDate)}</td>
                    <td className="px-6 py-3 text-gray-500 max-w-xs truncate">{r.reason ?? "—"}</td>
                    <td className="px-6 py-3"><Badge className={statusStyle[r.status] ?? ""}>{r.status}</Badge></td>
                    <td className="px-6 py-3">
                      {r.status === "PENDING" ? <LeaveDecisionButtons leaveId={r.id} /> : <span className="text-xs text-gray-400">—</span>}
                    </td>
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
