-- แก้จาก `prisma migrate dev` เดิม: ตั้ง DEFAULT now() ให้ updatedAt เพราะตารางเหล่านี้มีข้อมูลอยู่จริงแล้ว
-- (โดยเฉพาะบน production) NOT NULL แบบไม่มี default จะ apply ไม่ผ่านกับแถวที่มีอยู่ก่อน
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "lastEditedBy" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "lastEditedBy" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "lastEditedBy" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "lastEditedBy" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
