import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { Pagination } from "@/components/shared/pagination";
import { Library } from "lucide-react";

interface Props {
  searchParams: Promise<{ booksPage?: string; issuesPage?: string }>;
}

export default async function LibraryPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const sp = await searchParams;
  const limit = 20;
  const booksPage = parseInt(sp.booksPage ?? "1");
  const issuesPage = parseInt(sp.issuesPage ?? "1");
  const booksSkip = (booksPage - 1) * limit;
  const issuesSkip = (issuesPage - 1) * limit;

  const [allBooks, books, totalBooksCount, allActiveIssues, activeIssues, totalIssuesCount] = await Promise.all([
    prisma.libraryBook.findMany({ where: { schoolId }, select: { totalCopies: true, availableCopies: true } }),
    prisma.libraryBook.findMany({ where: { schoolId }, orderBy: { title: "asc" }, skip: booksSkip, take: limit }),
    prisma.libraryBook.count({ where: { schoolId } }),
    prisma.libraryIssue.findMany({ where: { schoolId, status: "ISSUED" }, select: { dueDate: true } }),
    prisma.libraryIssue.findMany({
      where: { schoolId, status: "ISSUED" },
      include: {
        book: { select: { title: true } },
        student: { include: { user: { select: { name: true } } } },
      },
      orderBy: { dueDate: "asc" },
      skip: issuesSkip,
      take: limit,
    }),
    prisma.libraryIssue.count({ where: { schoolId, status: "ISSUED" } }),
  ]);
  const booksTotalPages = Math.ceil(totalBooksCount / limit);
  const issuesTotalPages = Math.ceil(totalIssuesCount / limit);

  const totalBooks     = allBooks.reduce((s, b) => s + b.totalCopies, 0);
  const availableCopies = allBooks.reduce((s, b) => s + b.availableCopies, 0);
  const overdue = allActiveIssues.filter((i) => i.dueDate && new Date(i.dueDate) < new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Library</h1>
        <p className="text-sm text-gray-500 mt-1">{totalBooksCount} titles · {totalBooks} copies</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Books"     value={totalBooksCount}     subtitle="Total titles"     icon={<Library className="w-5 h-5" />} color="indigo" />
        <StatCard title="Available" value={availableCopies}     subtitle="Copies available" icon={<Library className="w-5 h-5" />} color="green"  />
        <StatCard title="Issued"    value={totalIssuesCount}    subtitle="Currently out"    icon={<Library className="w-5 h-5" />} color="blue"   />
        <StatCard title="Overdue"   value={overdue.length}      subtitle="Need return"      icon={<Library className="w-5 h-5" />} color={overdue.length > 0 ? "red" : "green"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Book Catalogue</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Author</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Available</th>
              </tr></thead>
              <tbody className="divide-y">
                {books.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{b.title}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{b.author ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right"><Badge className={b.availableCopies > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{b.availableCopies}/{b.totalCopies}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          {booksTotalPages > 1 && (
            <div className="px-4 py-3 border-t">
              <Pagination
                page={booksPage}
                totalPages={booksTotalPages}
                total={totalBooksCount}
                limit={limit}
                skip={booksSkip}
                pageParam="booksPage"
                queryString={`issuesPage=${issuesPage}`}
              />
            </div>
          )}
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Currently Issued</CardTitle></CardHeader>
          <CardContent className="p-0">
            {totalIssuesCount === 0 ? <p className="text-sm text-gray-400 text-center py-8">No books issued.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Student</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Book</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Due</th>
                </tr></thead>
                <tbody className="divide-y">
                  {activeIssues.map((i) => {
                    const od = i.dueDate && new Date(i.dueDate) < new Date();
                    return (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-900 text-xs font-medium">{i.student?.user?.name}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{i.book?.title}</td>
                        <td className={`px-4 py-2.5 text-xs ${od ? "text-red-600 font-semibold" : "text-gray-500"}`}>{i.dueDate ? new Date(i.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
          {issuesTotalPages > 1 && (
            <div className="px-4 py-3 border-t">
              <Pagination
                page={issuesPage}
                totalPages={issuesTotalPages}
                total={totalIssuesCount}
                limit={limit}
                skip={issuesSkip}
                pageParam="issuesPage"
                queryString={`booksPage=${booksPage}`}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
