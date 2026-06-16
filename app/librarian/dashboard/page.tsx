import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, BookOpen, AlertTriangle, DollarSign } from "lucide-react";

export default async function LibrarianDashboard() {
  const session = await auth();
  const schoolId = session?.user.schoolId;

  const [totalBooks, issuedBooks, overdueBooks] = await Promise.all([
    schoolId ? prisma.libraryBook.count({ where: { schoolId } }) : 0,
    schoolId ? prisma.libraryIssue.count({ where: { schoolId, status: "ISSUED" } }) : 0,
    schoolId ? prisma.libraryIssue.count({ where: { schoolId, status: "OVERDUE" } }) : 0,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Library Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Books" value={totalBooks} subtitle="In inventory" icon={<Library className="w-5 h-5" />} color="indigo" />
        <StatCard title="Issued" value={issuedBooks} subtitle="Currently issued" icon={<BookOpen className="w-5 h-5" />} color="blue" />
        <StatCard title="Overdue" value={overdueBooks} subtitle="Past due date" icon={<AlertTriangle className="w-5 h-5" />} color="red" />
        <StatCard title="Fines Collected" value="₹0" subtitle="This month" icon={<DollarSign className="w-5 h-5" />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Recently Issued</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No books issued recently.</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Overdue Returns</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-500">No overdue books.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
