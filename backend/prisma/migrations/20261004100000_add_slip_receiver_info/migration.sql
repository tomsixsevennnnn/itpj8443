-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "paymentSlipReceiverName" TEXT,
ADD COLUMN "paymentSlipReceiverAccount" TEXT,
ADD COLUMN "paymentSlipReceivingBank" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "slipOkLastReceiverName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "slipOkLastReceiverAccount" TEXT NOT NULL DEFAULT '',
ADD COLUMN "slipOkLastReceivingBank" TEXT NOT NULL DEFAULT '',
ADD COLUMN "slipOkLastReceiverMatched" BOOLEAN,
ADD COLUMN "slipOkLastReceiverAt" TIMESTAMP(3);
