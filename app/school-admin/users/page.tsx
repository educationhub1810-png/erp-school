import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { CreateUserDialog } from "./create-user-dialog";
import { ROLE_LABELS } from "@/lib/roles";
import { Users } from "lucide-react";
import type { AppRole } from "@/lib/roles";
import { Pagination } from "@/components/shared/pagination";

interface Props {
  searchParams: Promise<{ role?: string; page?: string }>;
}

const ROLE_COLORS: Record<string, string> = {
  SCHOOL_ADMIN: "bg-purple-100 text-purple-700",
  PRINCIPAL: "bg-blue-100 text-blue-700",
  TEACHER: "bg-indigo-100 text-indigo-700",
  STUDENT: "bg-green-100 text-green-700",
  PARENT: "bg-yellow-100 text-yellow-700",
  ACCOUNTANT: "bg-orange-100 text-orange-700",
  LIBRARIAN: "bg-pink-100 text-pink-700",
  TRANSPORT_MANAGER: "bg-teal-100 text-teal-700",
  HR_MANAGER: "bg-red-100 text-red-700",
  WARDEN_MANAGER: "bg-cyan-100 text-cyan-700",
  MESS_MANAGER: "bg-lime-100 text-lime-700",
};

export default async function UsersPage({ searchParams }: Props) {
  const session = await auth();
  const schoolId = session?.user.schoolId!;
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    schoolId,
    role: { not: "SUPER_ADMIN" as const },
    ...(sp.role && { role: sp.role as never }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">{total} users</p>
        </div>
        <CreateUserDialog />
      </div>

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2">
        <a href="?" className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!sp.role ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          All
        </a>
        {(Object.keys(ROLE_LABELS) as AppRole[]).filter(r => r !== "SUPER_ADMIN").map((role) => (
          <a
            key={role}
            href={`?role=${role}`}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${sp.role === role ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {ROLE_LABELS[role]}
          </a>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email / Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{user.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.email && <p>{user.email}</p>}
                        {user.mobile && <p className="text-gray-400">{user.mobile}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700"} hover:opacity-90`}>
                        {ROLE_LABELS[user.role as AppRole]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                      }>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        skip={skip}
        queryString={sp.role ? `role=${sp.role}` : ""}
      />
    </div>
  );
}
