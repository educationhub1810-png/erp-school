import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { UserCog } from "lucide-react";
import { CreatePrincipalDialog } from "./create-principal-dialog";
import { StaffRowActions } from "@/app/super-admin/_staff/staff-row-actions";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function SchoolAdminPrincipalsPage({ searchParams }: Props) {
  const session = await auth();
  const schoolId = session?.user.schoolId!;
  const sp = await searchParams;

  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = { schoolId, user: { role: "PRINCIPAL" as const } };

  const [principals, total, school] = await Promise.all([
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
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, principalName: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Principal</h1>
          <p className="text-sm text-gray-500 mt-1">{total} principal{total !== 1 ? "s" : ""}</p>
        </div>
        <CreatePrincipalDialog
          schoolName={school?.name ?? ""}
          principalName={school?.principalName}
        />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {principals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCog className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No principal added yet</p>
              <p className="text-sm text-gray-400 mt-1">Add the school principal to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Principal Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {principals.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-600">{p.employeeId}</TableCell>
                    <TableCell className="font-medium text-gray-900">{p.user.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{p.qualification ?? "—"}</TableCell>
                    <TableCell className="text-xs text-gray-500">{p.user.email ?? p.user.mobile ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={p.user.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                        }
                      >
                        {p.user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <StaffRowActions role="PRINCIPAL" roleLabel="Principal" staff={p} />
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
