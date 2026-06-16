import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SubjectsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const subjects = await prisma.subject.findMany({
    where: { schoolId: (session.user as any).schoolId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
        <p className="text-sm text-gray-500 mt-1">{subjects.length} subjects</p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {subjects.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No subjects found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Subject</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Code</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">{s.code ?? "—"}</td>
                    <td className="px-6 py-3">
                      <Badge className={s.isElective ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                        {s.isElective ? "Elective" : "Core"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
