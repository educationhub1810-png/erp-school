-- AlterEnum
ALTER TYPE "FrequencyType" ADD VALUE 'HALF_YEARLY';

-- AlterTable
ALTER TABLE "fee_payments" ADD COLUMN     "periodLabel" TEXT;

-- AlterTable
ALTER TABLE "fee_structures" ADD COLUMN     "installments" JSONB,
ADD COLUMN     "monthlyDueDay" INTEGER;
