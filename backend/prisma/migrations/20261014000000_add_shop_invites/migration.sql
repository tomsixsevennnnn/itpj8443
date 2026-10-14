-- CreateTable
CREATE TABLE "ShopInvite" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopInvite_email_idx" ON "ShopInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ShopInvite_shopId_email_key" ON "ShopInvite"("shopId", "email");

-- AddForeignKey
ALTER TABLE "ShopInvite" ADD CONSTRAINT "ShopInvite_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
