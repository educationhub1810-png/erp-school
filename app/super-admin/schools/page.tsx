import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSchoolDialog } from "./create-school-dialog";
import { SchoolToggle } from "./school-toggle";
import { SchoolQuickActions } from "./school-quick-actions";
import { Pagination } from "@/components/shared/pagination";
import { School, Users, GraduationCap, MapPin, Phone, Mail } from "lucide-react";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

function schoolInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "S";
}

export default async function SchoolsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { students: true, teachers: true, users: true } },
      },
      skip,
      take: limit,
    }),
    prisma.school.count(),
  ]);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
          <p className="text-sm text-gray-500 mt-1">{total} school{total !== 1 ? "s" : ""} registered</p>
        </div>
        <CreateSchoolDialog />
      </div>

      {total === 0 ? (
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
            <Card
              key={school.id}
              className={`border-0 border-l-4 shadow-sm hover:shadow-md transition-shadow ${
                school.isActive ? "border-l-green-400" : "border-l-gray-300 bg-gray-50/50"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Avatar size="lg" className="shrink-0">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
                      {schoolInitials(school.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base truncate">{school.name}</CardTitle>
                      <Badge className={`shrink-0 ${school.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {school.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      <span className="font-semibold text-indigo-600">{school.code}</span>
                    </p>
                  </div>
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

                <div className="flex items-center gap-2 pt-3 border-t">
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                    <GraduationCap className="w-3.5 h-3.5" /> {school._count.students} Students
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                    <Users className="w-3.5 h-3.5" /> {school._count.users} Users
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1">Quick Add</p>
                    <SchoolQuickActions school={school} />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <SchoolToggle id={school.id} isActive={school.isActive} name={school.name} />
                    <p className="text-xs text-gray-400">
                      {new Date(school.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} skip={skip} />
    </div>
  );
}
