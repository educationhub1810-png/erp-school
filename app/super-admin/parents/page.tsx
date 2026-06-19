import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateParentDialog } from "./create-parent-dialog";
import { ParentFilters } from "./parent-filters";
import { ParentRowActions } from "./parent-row-actions";
import { Home } from "lucide-react";

interface Props {
  searchParams: Promise<{ schoolId?: string; search?: string; page?: string }>;
}

const PARENT_TYPE_LABEL: Record<string, string> = {
  FATHER: "Father",
  MOTHER: "Mother",
  GUARDIAN: "Guardian",
};

export default async function SuperAdminParentsPage({ searchParams }: Props) {
  const sp = await searchParams;

  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    role: "PARENT" as const,
    ...(sp.schoolId && { schoolId: sp.schoolId }),
    ...(sp.search && {
      OR: [
        { name: { contains: sp.search, mode: "insensitive" as const } },
        { email: { contains: sp.search, mode: "insensitive" as const } },
        { parentProfile: { parentCode: { contains: sp.search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [parents, total, schools] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, mobile: true, isActive: true,
        school: { select: { name: true, code: true } },
        parentProfile: {
          select: {
            parentCode: true, parentType: true, firstName: true, middleName: true, lastName: true,
            gender: true, dob: true, maritalStatus: true, nationality: true, aadhaar: true, pan: true, address: true,
            student: { select: { firstName: true, lastName: true, studentCode: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parents</h1>
          <p className="text-sm text-gray-500 mt-1">{total} parent account{total !== 1 ? "s" : ""} across all schools</p>
        </div>
        <CreateParentDialog schools={schools} />
      </div>

      <p className="text-xs text-gray-400">
        Each parent account (Father/Mother/Guardian) is linked to the student it belongs to.
      </p>

      <ParentFilters schools={schools} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {parents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Home className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No parent accounts found</p>
              <p className="text-sm text-gray-400 mt-1">Add a parent account to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Parent Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Child</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-xs text-gray-700">{p.parentProfile?.parentCode ?? "—"}</TableCell>
                    <TableCell className="font-medium text-gray-900">{p.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {p.parentProfile ? PARENT_TYPE_LABEL[p.parentProfile.parentType] : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {p.parentProfile?.student
                        ? <>{p.parentProfile.student.firstName} {p.parentProfile.student.lastName} <span className="text-xs text-gray-400">({p.parentProfile.student.studentCode})</span></>
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {p.school ? <>{p.school.name} <span className="text-xs text-gray-400">({p.school.code})</span></> : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{p.email ?? p.mobile ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={p.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                        }
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ParentRowActions
                        parent={{
                          ...p,
                          parentProfile: p.parentProfile ? { ...p.parentProfile, dob: p.parentProfile.dob?.toISOString() ?? null } : null,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" render={<a href={`?page=${page - 1}`} />}>
                Previous
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" render={<a href={`?page=${page + 1}`} />}>
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
