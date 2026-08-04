-- CreateTable
CREATE TABLE "BookingCounter" (
    "year" INTEGER NOT NULL,
    "lastNo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BookingCounter_pkey" PRIMARY KEY ("year")
);

-- AlterTable: add nullable first so existing rows can be backfilled before enforcing NOT NULL
ALTER TABLE "Booking" ADD COLUMN "bookingYear" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "bookingNo" INTEGER;

-- Backfill existing bookings: number sequentially per year, ordered by createdAt
WITH numbered AS (
  SELECT "id",
         EXTRACT(YEAR FROM "createdAt")::INTEGER AS year,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "createdAt") ORDER BY "createdAt") AS rn
  FROM "Booking"
)
UPDATE "Booking" b
SET "bookingYear" = numbered.year,
    "bookingNo" = numbered.rn
FROM numbered
WHERE b."id" = numbered."id";

-- Seed BookingCounter with the highest number already used per year
INSERT INTO "BookingCounter" ("year", "lastNo")
SELECT "bookingYear", MAX("bookingNo")
FROM "Booking"
GROUP BY "bookingYear"
ON CONFLICT ("year") DO UPDATE SET "lastNo" = EXCLUDED."lastNo";

-- Enforce NOT NULL now that all existing rows are backfilled
ALTER TABLE "Booking" ALTER COLUMN "bookingYear" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "bookingNo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingYear_bookingNo_key" ON "Booking"("bookingYear", "bookingNo");
