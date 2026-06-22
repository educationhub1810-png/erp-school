import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { Briefcase } from "lucide-react";
import { CreateStaffDialog } from "./create-staff-dialog";
import { StaffRowActions } from "./staff-row-actions";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function StaffPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const [staff, total] = await Promise.all([
    prisma.staff.findMany({
      where: { schoolId },
      include: { user: { select: { name: true, email: true, mobile: true, isActive: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.staff.count({ where: { schoolId } }),
  ]);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-1">{total} staff members</p>
        </div>
        <CreateStaffDialog />
      </div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> All Staff
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No staff records found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Department</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Designation</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Contact</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{s.user?.name}</td>
                    <td className="px-6 py-3 text-gray-500">{s.department ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-500">{s.designation ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">{s.user?.email ?? s.user?.mobile ?? "—"}</td>
                    <td className="px-6 py-3">
                      <Badge className={s.user?.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                        {s.user?.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <StaffRowActions staff={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} skip={skip} />
    </div>
  );
}
