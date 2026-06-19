-- AlterTable
ALTER TABLE "parent_profiles" ADD COLUMN     "studentId" TEXT;

-- AddForeignKey
ALTER TABLE "parent_profiles" ADD CONSTRAINT "parent_profiles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
