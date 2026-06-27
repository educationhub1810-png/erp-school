import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { AddStudentDialog } from "./add-student-dialog";
import { StudentRowActions } from "./student-row-actions";
import { GraduationCap, UserPlus } from "lucide-react";
import { StudentFilters } from "./student-filters";
import { sortClassesByGrade } from "@/lib/class-order";
import { ensureClassSections } from "@/lib/ensure-class-sections";
import { getPrincipalName } from "@/lib/principal";

interface Props {
  searchParams: Promise<{ classId?: string; sectionId?: string; search?: string; page?: string }>;
}

export default async function StudentsPage({ searchParams }: Props) {
  const session = await auth();
  const schoolId = session?.user.schoolId!;
  const sp = await searchParams;

  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    schoolId,
    isAlumni: false,
    ...(sp.classId && { classId: sp.classId }),
    ...(sp.sectionId && { sectionId: sp.sectionId }),
    ...(sp.search && {
      OR: [
        { firstName: { contains: sp.search, mode: "insensitive" as const } },
        { lastName: { contains: sp.search, mode: "insensitive" as const } },
        { studentCode: { contains: sp.search, mode: "insensitive" as const } },
        { rollNumber: { contains: sp.search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [students, total, classesQuery, principalName] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
        user: { select: { isActive: true, email: true, mobile: true } },
      },
      orderBy: { admissionDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
    prisma.class.findMany({
      where: { schoolId },
      include: { sections: true },
    }),
    getPrincipalName(schoolId),
  ]);
  let classesRaw = classesQuery;
  if (await ensureClassSections(classesRaw)) {
    classesRaw = await prisma.class.findMany({ where: { schoolId }, include: { sections: true } });
  }
  const classes = sortClassesByGrade(classesRaw);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} student{total !== 1 ? "s" : ""} enrolled
            {principalName && <span> · Principal: <span className="text-gray-700 font-medium">{principalName}</span></span>}
          </p>
        </div>
        <AddStudentDialog classes={classes} schoolId={schoolId} />
      </div>

      <StudentFilters classes={classes} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No students found</p>
              <p className="text-sm text-gray-400 mt-1">Add your first student to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Student Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-600">
                      {student.studentCode}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">
                          {student.firstName} {student.middleName} {student.lastName}
                        </p>
                        {student.rollNumber && (
                          <p className="text-xs text-gray-400">Roll: {student.rollNumber}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {student.class.name}
                        {student.section && ` - ${student.section.name}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {student.rollNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {student.gender.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={student.user.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                        }
                      >
                        {student.user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" nativeButton={false} render={<a href={`/school-admin/students/${student.id}`} />}>
                          View
                        </Button>
                        <StudentRowActions student={student} classes={classes} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
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
