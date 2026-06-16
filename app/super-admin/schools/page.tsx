import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSchoolDialog } from "./create-school-dialog";
import { SchoolToggle } from "./school-toggle";
import { School, Users, GraduationCap, MapPin, Phone, Mail } from "lucide-react";

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
            <Card key={school.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${!school.isActive ? "opacity-60" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{school.name}</CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      Code: <span className="font-semibold text-indigo-600">{school.code}</span>
                    </p>
                  </div>
                  <Badge className={`shrink-0 ${school.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {school.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5 text-xs text-gray-500">
                  {(school.city || school.state) && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {[school.city, school.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {school.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" /> {school.phone}
                    </p>
                  )}
                  {school.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 shrink-0" /> {school.email}
                    </p>
                  )}
                  {school.principalName && (
                    <p className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 shrink-0" /> {school.principalName}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-2 border-t text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" /> {school._count.students} students
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {school._count.users} users
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-gray-400">
                    {new Date(school.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <SchoolToggle id={school.id} isActive={school.isActive} name={school.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
