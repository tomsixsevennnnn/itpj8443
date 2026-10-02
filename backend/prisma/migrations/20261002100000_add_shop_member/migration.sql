-- CreateTable
CREATE TABLE "ShopMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopMember_shopId_idx" ON "ShopMember"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopMember_userId_shopId_key" ON "ShopMember"("userId", "shopId");

-- AddForeignKey
ALTER TABLE "ShopMember" ADD CONSTRAINT "ShopMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopMember" ADD CONSTRAINT "ShopMember_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ย้าย owner เดิมทุกคน (User.role = OWNER + shopId) เป็นแถว ShopMember
INSERT INTO "ShopMember" ("id", "userId", "shopId")
SELECT 'sm_' || "id", "id", "shopId" FROM "User" WHERE "role" = 'OWNER' AND "shopId" IS NOT NULL;

-- owner กลายเป็น CUSTOMER ระดับระบบ (ความเป็น owner อยู่ที่ ShopMember แล้ว)
UPDATE "User" SET "role" = 'CUSTOMER' WHERE "role" = 'OWNER';

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_shopId_fkey";

-- DropIndex
DROP INDEX "User_shopId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "shopId";
