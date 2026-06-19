import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { Library } from "lucide-react";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function StudentLibraryPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const student = await prisma.student.findFirst({
    where: { user: { email: session.user.email ?? undefined } },
  });
  const studentId = student?.id ?? "__none__";

  const [activeIssuesCount, issues, total] = await Promise.all([
    prisma.libraryIssue.count({ where: { studentId, status: "ISSUED" } }),
    prisma.libraryIssue.findMany({
      where: { studentId },
      include: { book: { select: { title: true, author: true, isbn: true } } },
      orderBy: { issueDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.libraryIssue.count({ where: { studentId } }),
  ]);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Library</h1>
        <p className="text-sm text-gray-500 mt-1">{activeIssuesCount} book{activeIssuesCount !== 1 ? "s" : ""} currently issued</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Library className="w-4 h-4" /> Book History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No books issued.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Book</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Author</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Issued</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Due</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {issues.map((i) => {
                  const overdue = i.status === "ISSUED" && i.dueDate && new Date(i.dueDate) < new Date();
                  return (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{i.book?.title}</td>
                      <td className="px-6 py-3 text-gray-500">{i.book?.author ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(i.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                      <td className={`px-6 py-3 ${overdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                        {i.dueDate ? new Date(i.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge className={
                          overdue ? "bg-red-100 text-red-700" :
                          i.status === "ISSUED" ? "bg-blue-100 text-blue-700" :
                          "bg-green-100 text-green-700"
                        }>
                          {overdue ? "Overdue" : i.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} skip={skip} />
    </div>
  );
}
