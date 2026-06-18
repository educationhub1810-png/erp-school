-- Rename admissionNumber to studentCode (preserves existing data)
ALTER TABLE "students" RENAME COLUMN "admissionNumber" TO "studentCode";
ALTER INDEX "students_schoolId_admissionNumber_key" RENAME TO "students_schoolId_studentCode_key";
