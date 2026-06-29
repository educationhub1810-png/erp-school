import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { Users } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";
import type { Prisma } from "@/lib/generated/prisma/client";
import { School as SchoolIcon } from "lucide-react";
import { UserFilters } from "./user-filters";
import { DeleteUserAction } from "@/components/shared/delete-user-action";
import { ResetPasswordAction } from "@/components/shared/reset-password-action";
import { EditUserAction } from "@/components/shared/edit-user-action";

// Sentinel school value for the "Super Admins" view — these accounts belong to
// no school. Kept in sync with the same constant in user-filters.tsx.
const PLATFORM_SCOPE = "platform";

interface Props {
  searchParams: Promise<{ page?: string; search?: string; role?: string; schoolId?: string }>;
}

export default async function SuperAdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const actor = getUser(session);

  const roleFilter = sp.role && sp.role !== "SUPER_ADMIN" && sp.role in ROLE_LABELS
    ? (sp.role as AppRole)
    : undefined;

  // The school filter doubles as the gate: a value must be picked before any
  // users are listed. With many schools and users, showing everyone at once is
  // overwhelming. The sentinel "platform" lists the SUPER_ADMIN accounts, which
  // belong to no school.
  const platformView = sp.schoolId === PLATFORM_SCOPE;
  const schoolSelected = Boolean(sp.schoolId);

  const where: Prisma.UserWhereInput = {
    ...(platformView
      ? { role: "SUPER_ADMIN" }
      : { role: roleFilter ?? { not: "SUPER_ADMIN" }, schoolId: sp.schoolId }),
    ...(sp.search && {
      OR: [
        { name: { contains: sp.search, mode: "insensitive" as const } },
        { email: { contains: sp.search, mode: "insensitive" as const } },
        { mobile: { contains: sp.search, mode: "insensitive" as const } },
      ],
    }),
  };

  const schools = await prisma.school.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  const [users, total] = schoolSelected
    ? await Promise.all([
        prisma.user.findMany({
          where,
          include: { school: { select: { name: true, code: true } } },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ])
    : [[], 0];
  const totalPages = Math.ceil(total / limit);

  const selectedSchool = schools.find((s) => s.id === sp.schoolId);

  const queryString = [
    sp.search && `search=${encodeURIComponent(sp.search)}`,
    sp.role && `role=${sp.role}`,
    sp.schoolId && `schoolId=${sp.schoolId}`,
  ].filter(Boolean).join("&");

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
          <p className="text-sm text-gray-500 mt-1">
            {!schoolSelected
              ? "Choose a school to view its users"
              : platformView
                ? `${total} super admin${total === 1 ? "" : "s"}`
                : `${total} users in ${selectedSchool?.name ?? "selected school"}`}
          </p>
        </div>
      </div>

      <UserFilters schools={schools} />

      {!schoolSelected ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="rounded-full bg-indigo-50 p-4">
              <SchoolIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <p className="text-base font-medium text-gray-900">Select a school to get started</p>
            <p className="text-sm text-gray-500 max-w-sm">
              Pick a school from the filter above to list its users. You can then narrow down by role
              or search by name, email, or mobile.
            </p>
          </CardContent>
        </Card>
      ) : (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> User Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {total === 0 ? (
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
                    <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
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
                      <td className="px-6 py-3">
                        <div className="flex justify-end items-center gap-1">
                          <EditUserAction
                            userId={user.id}
                            name={user.name}
                            email={user.email}
                            mobile={user.mobile}
                          />
                          <ResetPasswordAction userId={user.id} name={user.name} />
                          <DeleteUserAction
                            userId={user.id}
                            name={user.name}
                            disabled={user.id === actor.id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {schoolSelected && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} skip={skip} queryString={queryString} />
      )}
    </div>
  );
}
