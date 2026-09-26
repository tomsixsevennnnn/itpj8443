-- CreateEnum
CREATE TYPE "SlipVerifyStatus" AS ENUM ('VERIFIED', 'DUPLICATE', 'AMOUNT_MISMATCH', 'ACCOUNT_MISMATCH', 'REJECTED', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentSlipVerifyStatus" "SlipVerifyStatus",
ADD COLUMN     "paymentSlipVerifyMessage" TEXT,
ADD COLUMN     "paymentSlipTransRef" TEXT,
ADD COLUMN     "paymentSlipVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "slipOkApiKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "slipOkBranchId" TEXT NOT NULL DEFAULT '';
