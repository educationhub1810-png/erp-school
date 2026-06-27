import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateStaffDialog } from "./create-staff-dialog";
import { StaffFilters } from "./staff-filters";
import { StaffRowActions } from "./staff-row-actions";
import { Briefcase } from "lucide-react";
import type { StaffRole } from "./role-fields";

interface Props {
  role: StaffRole;
  roleLabel: string;
  roleLabelPlural: string;
  searchParams: Promise<{ schoolId?: string; search?: string; page?: string }>;
}

export async function StaffManagement({ role, roleLabel, roleLabelPlural, searchParams }: Props) {
  const sp = await searchParams;

  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(sp.schoolId && { schoolId: sp.schoolId }),
    user: {
      role,
      ...(sp.search && {
        OR: [
          { name: { contains: sp.search, mode: "insensitive" as const } },
          { email: { contains: sp.search, mode: "insensitive" as const } },
        ],
      }),
    },
  };

  const [staff, total, schools] = await Promise.all([
    prisma.staff.findMany({
      where,
      include: {
        school: { select: { name: true, code: true } },
        user: { select: { name: true, email: true, mobile: true, isActive: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.staff.count({ where }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true, principalName: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{roleLabelPlural}</h1>
          <p className="text-sm text-gray-500 mt-1">{total} {roleLabelPlural.toLowerCase()} across all schools</p>
        </div>
        <CreateStaffDialog role={role} roleLabel={roleLabel} schools={schools} />
      </div>

      <StaffFilters schools={schools} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No {roleLabelPlural.toLowerCase()} found</p>
              <p className="text-sm text-gray-400 mt-1">Add a {roleLabel.toLowerCase()} to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>{role === "PRINCIPAL" ? "Principal Code" : "Employee ID"}</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-600">{s.employeeId}</TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{s.user.name}</p>
                      {s.designation && <p className="text-xs text-gray-400">{s.designation}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {s.school.name} <span className="text-xs text-gray-400">({s.school.code})</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{s.department ?? "—"}</TableCell>
                    <TableCell className="text-xs text-gray-500">{s.user.email ?? s.user.mobile ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={s.user.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                        }
                      >
                        {s.user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <StaffRowActions role={role} roleLabel={roleLabel} staff={s} />
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
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={`?page=${page - 1}`} />}>
                Previous
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={`?page=${page + 1}`} />}>
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
