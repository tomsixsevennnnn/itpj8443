-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "paymentSlipAttempts" INTEGER NOT NULL DEFAULT 0;

-- ใบจองที่มีสลิปอยู่แล้วนับเป็นแนบมา 1 ครั้ง
UPDATE "Booking" SET "paymentSlipAttempts" = 1 WHERE "paymentSlipUrl" IS NOT NULL;
