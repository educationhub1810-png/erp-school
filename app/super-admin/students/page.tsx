import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { CreateStudentDialog } from "./create-student-dialog";
import { StudentFilters } from "./student-filters";
import { StudentRowActions } from "./student-row-actions";
import { GraduationCap } from "lucide-react";
import { getStudentAvatarSrc } from "@/lib/student-avatar";

interface Props {
  searchParams: Promise<{ schoolId?: string; classId?: string; sectionId?: string; search?: string; page?: string }>;
}

export default async function SuperAdminStudentsPage({ searchParams }: Props) {
  const sp = await searchParams;

  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    isAlumni: false,
    ...(sp.schoolId && { schoolId: sp.schoolId }),
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

  const [students, total, schools, classes] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        school: { select: { name: true, code: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
        user: { select: { isActive: true, email: true, mobile: true } },
      },
      orderBy: { admissionDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    sp.schoolId
      ? prisma.class.findMany({ where: { schoolId: sp.schoolId }, include: { sections: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">{total} student{total !== 1 ? "s" : ""} across all schools</p>
        </div>
        <CreateStudentDialog schools={schools} />
      </div>

      <StudentFilters schools={schools} classes={classes} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No students found</p>
              <p className="text-sm text-gray-400 mt-1">Add a student to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Student Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>School</TableHead>
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
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarImage src={getStudentAvatarSrc(student.photoUrl, student.gender)} alt="" />
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">
                            {student.firstName} {student.middleName} {student.lastName}
                          </p>
                          {student.rollNumber && (
                            <p className="text-xs text-gray-400">Roll: {student.rollNumber}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {student.school.name} <span className="text-xs text-gray-400">({student.school.code})</span>
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
                      <StudentRowActions student={student} />
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
