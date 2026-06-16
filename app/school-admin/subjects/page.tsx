import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";

export default async function SubjectsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
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
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Total Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">{s.code ?? "—"}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{s.totalMarks}</td>
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
