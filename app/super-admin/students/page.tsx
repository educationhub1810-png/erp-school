import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreateStudentDialog } from "./create-student-dialog";
import { StudentFilters } from "./student-filters";
import { StudentRowActions } from "./student-row-actions";
import { GraduationCap, Building2 } from "lucide-react";
import { getStudentAvatarSrc } from "@/lib/student-avatar";
import { Pagination } from "@/components/shared/pagination";
import { sortClassesByGrade } from "@/lib/class-order";

const GENDER_BADGE: Record<string, string> = {
  MALE: "bg-blue-100 text-blue-700",
  FEMALE: "bg-pink-100 text-pink-700",
  OTHER: "bg-gray-100 text-gray-600",
};

const AVATAR_RING: Record<string, string> = {
  MALE: "ring-blue-200",
  FEMALE: "ring-pink-200",
  OTHER: "ring-gray-200",
};

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

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

  const [students, total, schools, classesRaw] = await Promise.all([
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
      ? prisma.class.findMany({ where: { schoolId: sp.schoolId }, include: { sections: true } })
      : Promise.resolve([]),
  ]);
  const classes = sortClassesByGrade(classesRaw);

  const totalPages = Math.ceil(total / limit);

  const queryString = [
    sp.schoolId && `schoolId=${sp.schoolId}`,
    sp.classId && `classId=${sp.classId}`,
    sp.sectionId && `sectionId=${sp.sectionId}`,
    sp.search && `search=${encodeURIComponent(sp.search)}`,
  ].filter(Boolean).join("&");

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

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No students found</p>
              <p className="text-sm text-gray-400 mt-1">Add a student to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">Student</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">School</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">Class</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">Roll No.</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">Gender</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id} className="hover:bg-indigo-50/40 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className={`size-9 ring-2 ${AVATAR_RING[student.gender] ?? AVATAR_RING.OTHER}`}>
                            <AvatarImage src={getStudentAvatarSrc(student.photoUrl, student.gender)} alt="" />
                            <AvatarFallback className="text-xs font-semibold">
                              {initials(student.firstName, student.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {student.firstName} {student.middleName} {student.lastName}
                            </p>
                            <p className="text-xs font-mono text-gray-400">{student.studentCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>
                            {student.school.name} <span className="text-xs text-gray-400">({student.school.code})</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-normal">
                          {student.class.name}
                          {student.section && ` - ${student.section.name}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {student.rollNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${GENDER_BADGE[student.gender] ?? GENDER_BADGE.OTHER} hover:opacity-90 capitalize font-normal`}>
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
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} skip={skip} queryString={queryString} />
    </div>
  );
}
