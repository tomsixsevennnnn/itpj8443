-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "closedDates" TEXT[] DEFAULT ARRAY[]::TEXT[];
