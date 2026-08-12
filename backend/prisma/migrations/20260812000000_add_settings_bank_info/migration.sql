-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "bankName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bankAccountNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bankAccountName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "promptPayQr" TEXT NOT NULL DEFAULT '';
