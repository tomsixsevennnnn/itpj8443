-- Multi-tenant: เพิ่มตาราง Shop และ shopId ให้ทุกตารางข้อมูลจริง (MenuItem/Package/Booking/BookingCounter/
-- Settings/AuditLog/User) พร้อม backfill ข้อมูลเดิมทั้งหมดเข้า Shop เดียว ("shop_default") ก่อนบังคับ NOT NULL
-- เพราะ DB มีข้อมูลอยู่แล้ว (ไม่ใช่ DB ว่างเปล่า) ต้อง backfill ก่อนเสมอ ไม่งั้น ALTER ... SET NOT NULL จะพังทันที

-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum: เพิ่ม SUPER_ADMIN ต่อท้าย Role เดิม (CUSTOMER, OWNER) — ห้ามใช้ค่านี้ในทรานแซกชันเดียวกับที่เพิ่ม
-- (ข้อจำกัดของ Postgres) ไฟล์นี้ไม่ได้ assign SUPER_ADMIN ให้ใครเลยจึงไม่ชนกฎนี้
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- Seed ร้านเริ่มต้นจากชื่อร้านใน Settings แถวเดิม (ถ้ามี) กันข้อมูลเก่าทั้งหมดมีร้านให้ผูกอยู่เสมอ
INSERT INTO "Shop" ("id", "name", "slug", "status", "createdAt")
SELECT 'shop_default', COALESCE(NULLIF(TRIM(s."shopName"), ''), 'ร้านของฉัน'), 'default', 'ACTIVE', CURRENT_TIMESTAMP
FROM "Settings" s
LIMIT 1;

-- กันเคส DB ไม่มีแถว Settings เลย (ยังไม่เคยมีใครเข้าระบบ) ยังต้องมี shop_default ไว้เผื่อ backfill ตารางอื่นด้านล่าง
INSERT INTO "Shop" ("id", "name", "slug", "status", "createdAt")
SELECT 'shop_default', 'ร้านของฉัน', 'default', 'ACTIVE', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Shop" WHERE "id" = 'shop_default');

-- AlterTable: User.shopId (nullable — มีแค่ role OWNER เท่านั้นที่ควรผูก, CUSTOMER/SUPER_ADMIN ปล่อย null)
ALTER TABLE "User" ADD COLUMN "shopId" TEXT;
UPDATE "User" SET "shopId" = 'shop_default' WHERE "role" = 'OWNER';

-- CreateIndex
CREATE INDEX "User_shopId_idx" ON "User"("shopId");

-- AddForeignKey (onDelete: SetNull — ตาม default ของ Prisma สำหรับ relation ที่เป็น optional และไม่ได้ระบุ onDelete เอง)
ALTER TABLE "User" ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: MenuItem.shopId
ALTER TABLE "MenuItem" ADD COLUMN "shopId" TEXT;
UPDATE "MenuItem" SET "shopId" = 'shop_default';
ALTER TABLE "MenuItem" ALTER COLUMN "shopId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "MenuItem_shopId_idx" ON "MenuItem"("shopId");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Package.shopId
ALTER TABLE "Package" ADD COLUMN "shopId" TEXT;
UPDATE "Package" SET "shopId" = 'shop_default';
ALTER TABLE "Package" ALTER COLUMN "shopId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Package_shopId_idx" ON "Package"("shopId");

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Booking.shopId — แทนที่ unique(bookingYear, bookingNo) เดิมด้วย unique(shopId, bookingYear, bookingNo)
-- และ index(date) เดิมด้วย index(shopId, date) เพราะแต่ละร้านมีเลขที่ใบจอง/คิววันที่เป็นของตัวเองแยกกัน
ALTER TABLE "Booking" ADD COLUMN "shopId" TEXT;
UPDATE "Booking" SET "shopId" = 'shop_default';
ALTER TABLE "Booking" ALTER COLUMN "shopId" SET NOT NULL;

DROP INDEX "Booking_bookingYear_bookingNo_key";
DROP INDEX "Booking_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Booking_shopId_bookingYear_bookingNo_key" ON "Booking"("shopId", "bookingYear", "bookingNo");
CREATE INDEX "Booking_shopId_date_idx" ON "Booking"("shopId", "date");
CREATE INDEX "Booking_shopId_idx" ON "Booking"("shopId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: BookingCounter — เปลี่ยน primary key จาก (year) เดี่ยวๆ เป็น (shopId, year) คู่ เพราะแต่ละร้าน
-- นับเลขที่ใบจองแยกจากกัน (ปีเดียวกัน ร้านต่างกัน ต้องนับคนละชุด)
ALTER TABLE "BookingCounter" ADD COLUMN "shopId" TEXT;
UPDATE "BookingCounter" SET "shopId" = 'shop_default';
ALTER TABLE "BookingCounter" DROP CONSTRAINT "BookingCounter_pkey";
ALTER TABLE "BookingCounter" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "BookingCounter" ADD CONSTRAINT "BookingCounter_pkey" PRIMARY KEY ("shopId", "year");

-- AddForeignKey
ALTER TABLE "BookingCounter" ADD CONSTRAINT "BookingCounter_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: AuditLog.shopId (nullable — null หมายถึง action ระดับ super admin ที่ไม่ผูกร้านไหน เช่น
-- shop.create/shop.setStatus เอง แต่ action เดิมทั้งหมดก่อนหน้านี้เป็นของร้านเดียวที่มีอยู่ตอนนี้ทั้งหมด backfill ได้เลย)
ALTER TABLE "AuditLog" ADD COLUMN "shopId" TEXT;
UPDATE "AuditLog" SET "shopId" = 'shop_default';

-- CreateIndex
CREATE INDEX "AuditLog_shopId_createdAt_idx" ON "AuditLog"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Settings — id เปลี่ยนชนิดจาก Int (ตายตัวที่ 1) เป็น Text (cuid ที่แอปสร้างเอง ไม่ต้องมี DB default
-- อีกต่อไป) บวก shopId unique ต่อร้าน (แถวเดียวต่อร้าน) — drop PK ก่อนเปลี่ยนชนิด id แล้วค่อยสร้างใหม่ทับ (ยืนยัน
-- ลำดับนี้ตรงกับที่ `prisma migrate diff` สร้างให้จากการเทียบ schema เดิม/ใหม่โดยตรง) ไม่กระทบ unique(id, version)
-- เดิมเลย เพราะ Postgres รีบิลด์ index ที่เหลือให้เองตอน ALTER COLUMN TYPE ไม่ต้อง drop/recreate index นั้นเอง
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_pkey";

ALTER TABLE "Settings" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Settings" ALTER COLUMN "id" SET DATA TYPE TEXT USING "id"::text;

ALTER TABLE "Settings" ADD CONSTRAINT "Settings_pkey" PRIMARY KEY ("id");

ALTER TABLE "Settings" ADD COLUMN "shopId" TEXT;
UPDATE "Settings" SET "shopId" = 'shop_default';
ALTER TABLE "Settings" ALTER COLUMN "shopId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shopId_key" ON "Settings"("shopId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
