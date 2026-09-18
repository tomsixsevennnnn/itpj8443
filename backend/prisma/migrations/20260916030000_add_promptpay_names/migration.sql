-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "promptPayQrFirstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "promptPayQrLastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "promptPayFirstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "promptPayLastName" TEXT NOT NULL DEFAULT '';
