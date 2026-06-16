import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SchoolInfoForm } from "./school-info-form";
import { AcademicYearManager } from "./academic-year-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SettingsPage() {
  const session = await auth();
  const schoolId = session?.user.schoolId!;

  const [school, academicYears] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId } }),
    prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" },
    }),
  ]);

  if (!school) return <p className="text-gray-500">School not found</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your school configuration</p>
      </div>

      <Tabs defaultValue="school">
        <TabsList className="mb-4">
          <TabsTrigger value="school">School Info</TabsTrigger>
          <TabsTrigger value="academic">Academic Years</TabsTrigger>
        </TabsList>

        <TabsContent value="school">
          <SchoolInfoForm school={school} />
        </TabsContent>

        <TabsContent value="academic">
          <AcademicYearManager years={academicYears} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
