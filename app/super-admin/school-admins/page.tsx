import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { DeleteUserAction } from "@/components/shared/delete-user-action";
import { ShieldCheck } from "lucide-react";
import { SchoolAdminFilters } from "./school-admin-filters";
import { CreateSchoolAdminDialog } from "./create-school-admin-dialog";

interface Props {
  searchParams: Promise<{ page?: string; search?: string; schoolId?: string }>;
}

export default async function SchoolAdminsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const actor = getUser(session);

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;
  const schoolSelected = Boolean(sp.schoolId);

  const schools = await prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });

  const where = {
    role: "SCHOOL_ADMIN" as const,
    schoolId: sp.schoolId,
    ...(sp.search && {
      OR: [
        { name: { contains: sp.search, mode: "insensitive" as const } },
        { email: { contains: sp.search, mode: "insensitive" as const } },
        { mobile: { contains: sp.search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [admins, total] = schoolSelected
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
    sp.schoolId && `schoolId=${sp.schoolId}`,
  ].filter(Boolean).join("&");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Admins</h1>
          <p className="text-sm text-gray-500 mt-1">
            {!schoolSelected ? "Choose a school to view its admins" : `${total} school admin${total === 1 ? "" : "s"} in ${selectedSchool?.name ?? "selected school"}`}
          </p>
        </div>
        <CreateSchoolAdminDialog schools={schools} />
      </div>

      <SchoolAdminFilters schools={schools} />

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!schoolSelected ? (
            <p className="text-sm text-gray-500 text-center py-12">Select a school above to list its admins</p>
          ) : total === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No school admins yet for {selectedSchool?.name}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Email / Mobile</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">School</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {admins.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-6 py-3 text-gray-500">{u.email || u.mobile || "—"}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {u.school ? <span>{u.school.name} <span className="text-xs text-gray-400">({u.school.code})</span></span> : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge className={u.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end">
                          <DeleteUserAction userId={u.id} name={u.name} disabled={u.id === actor.id} />
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

      {schoolSelected && <Pagination page={page} totalPages={totalPages} total={total} limit={limit} skip={skip} queryString={queryString} />}
    </div>
  );
}
