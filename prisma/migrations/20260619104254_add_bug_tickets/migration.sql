-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BugPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "bug_tickets" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "reporterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "whatNotWorking" TEXT NOT NULL,
    "whatExpected" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "BugPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bug_tickets_schoolId_idx" ON "bug_tickets"("schoolId");

-- CreateIndex
CREATE INDEX "bug_tickets_status_idx" ON "bug_tickets"("status");

-- AddForeignKey
ALTER TABLE "bug_tickets" ADD CONSTRAINT "bug_tickets_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_tickets" ADD CONSTRAINT "bug_tickets_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
