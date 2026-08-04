-- AlterTable: shop location + fuel cost for outside-zone distance-based delivery fee
ALTER TABLE "Settings"
  ADD COLUMN "shopLocationLat" DOUBLE PRECISION NOT NULL DEFAULT 13.8196,
  ADD COLUMN "shopLocationLng" DOUBLE PRECISION NOT NULL DEFAULT 100.0603,
  ADD COLUMN "fuelCostPerKm" DOUBLE PRECISION NOT NULL DEFAULT 8;
