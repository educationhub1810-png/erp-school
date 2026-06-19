-- Student codes are now globally unique (letter-of-school-prefixed), not just per school
DROP INDEX "students_schoolId_studentCode_key";
CREATE UNIQUE INDEX "students_studentCode_key" ON "students"("studentCode");
