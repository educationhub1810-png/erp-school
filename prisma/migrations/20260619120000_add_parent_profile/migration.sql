-- CreateEnum
CREATE TYPE "ParentType" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN');

-- CreateTable
CREATE TABLE "parent_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentCode" TEXT NOT NULL,
    "parentType" "ParentType" NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dob" TIMESTAMP(3),
    "nationality" TEXT,
    "aadhaar" TEXT,
    "pan" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parent_profiles_userId_key" ON "parent_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "parent_profiles_parentCode_key" ON "parent_profiles"("parentCode");

-- AddForeignKey
ALTER TABLE "parent_profiles" ADD CONSTRAINT "parent_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_profiles" ADD CONSTRAINT "parent_profiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
