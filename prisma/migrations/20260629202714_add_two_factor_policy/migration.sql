-- CreateTable
CREATE TABLE "two_factor_policies" (
    "role" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "two_factor_policies_pkey" PRIMARY KEY ("role")
);

