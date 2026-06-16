import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSchoolDialog } from "./create-school-dialog";
import { School, Users, GraduationCap } from "lucide-react";

export default async function SchoolsPage() {
  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, teachers: true, users: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
          <p className="text-sm text-gray-500 mt-1">{schools.length} school{schools.length !== 1 ? "s" : ""} registered</p>
        </div>
        <CreateSchoolDialog />
      </div>

      {schools.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <School className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No schools yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first school to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {schools.map((school) => (
            <Card key={school.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{school.name}</CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      Code: <span className="font-semibold text-indigo-600">{school.code}</span>
                    </p>
                  </div>
                  <Badge variant={school.isActive ? "default" : "secondary"} className={school.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                    {school.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {school.city && (
                  <p className="text-xs text-gray-500">{school.city}, {school.state}</p>
                )}
                <div className="flex items-center gap-4 pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {school._count.students} students
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    {school._count.users} users
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
