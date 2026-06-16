import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";

export default async function SuperAdminUsersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const users = await prisma.user.findMany({
    where: { role: { not: "SUPER_ADMIN" } },
    include: { school: { select: { name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });

  const roleColors: Record<string, string> = {
    SCHOOL_ADMIN:     "bg-purple-100 text-purple-700",
    PRINCIPAL:        "bg-blue-100 text-blue-700",
    TEACHER:          "bg-green-100 text-green-700",
    STUDENT:          "bg-yellow-100 text-yellow-700",
    PARENT:           "bg-orange-100 text-orange-700",
    ACCOUNTANT:       "bg-pink-100 text-pink-700",
    LIBRARIAN:        "bg-teal-100 text-teal-700",
    TRANSPORT_MANAGER:"bg-indigo-100 text-indigo-700",
    HR_MANAGER:       "bg-red-100 text-red-700",
    WARDEN_MANAGER:   "bg-cyan-100 text-cyan-700",
    MESS_MANAGER:     "bg-lime-100 text-lime-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Users</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} users across all schools</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> User Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Email / Mobile</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Role</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">School</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {user.email || user.mobile || "—"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge className={`${roleColors[user.role] ?? "bg-gray-100 text-gray-700"} hover:opacity-90`}>
                          {ROLE_LABELS[user.role as AppRole]}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {user.school ? (
                          <span>{user.school.name} <span className="text-xs text-gray-400">({user.school.code})</span></span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge className={user.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-red-100 text-red-700 hover:bg-red-100"
                        }>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
