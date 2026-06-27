import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { AddTeacherDialog } from "./add-teacher-dialog";
import { TeacherRowActions } from "./teacher-row-actions";
import { UserCheck } from "lucide-react";
import { getPrincipalName } from "@/lib/principal";

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function TeachersPage({ searchParams }: Props) {
  const session = await auth();
  const schoolId = session?.user.schoolId!;
  const sp = await searchParams;

  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    schoolId,
    ...(sp.search && {
      user: {
        OR: [
          { name: { contains: sp.search, mode: "insensitive" as const } },
          { email: { contains: sp.search, mode: "insensitive" as const } },
        ],
      },
    }),
  };

  const [teachers, total, principalName] = await Promise.all([
    prisma.teacher.findMany({
      where,
      include: { user: { select: { name: true, email: true, mobile: true, isActive: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.teacher.count({ where }),
    getPrincipalName(schoolId),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} teacher{total !== 1 ? "s" : ""}
            {principalName && <span> · Principal: <span className="text-gray-700 font-medium">{principalName}</span></span>}
          </p>
        </div>
        <AddTeacherDialog />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCheck className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No teachers yet</p>
              <p className="text-sm text-gray-400 mt-1">Add your first teacher</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((t) => (
                  <TableRow key={t.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-600">{t.employeeId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{t.user.name}</p>
                        {t.user.mobile && <p className="text-xs text-gray-400">{t.user.mobile}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{t.user.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{t.specialization ?? "—"}</TableCell>
                    <TableCell className="text-sm">{t.qualification ?? "—"}</TableCell>
                    <TableCell className="text-sm">{t.experienceYears ? `${t.experienceYears} yrs` : "—"}</TableCell>
                    <TableCell>
                      <Badge className={t.user.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                      }>
                        {t.user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TeacherRowActions teacher={t} />
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
            {page > 1 && <Button variant="outline" size="sm" nativeButton={false} render={<a href={`?page=${page - 1}`} />}>Previous</Button>}
            {page < totalPages && <Button variant="outline" size="sm" nativeButton={false} render={<a href={`?page=${page + 1}`} />}>Next</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
