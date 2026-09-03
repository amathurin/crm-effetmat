-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "invoiceDueDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "paymentInstructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "stripeGstTaxRateId" TEXT,
ADD COLUMN     "stripeQstTaxRateId" TEXT;
