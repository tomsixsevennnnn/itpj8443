-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Package" ADD COLUMN "deletedAt" TIMESTAMP(3);
