-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'OWNER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "auth0Sub" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "lineId" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "extraPrice" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerTable" INTEGER NOT NULL,
    "menuLimit" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "features" TEXT[],
    "badge" TEXT,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageCourse" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "choose" INTEGER NOT NULL,

    CONSTRAINT "PackageCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "tables" INTEGER NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "packageName" TEXT NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "pricePerTable" INTEGER,
    "deliveryFee" INTEGER,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "location" TEXT NOT NULL,
    "locationDetail" JSONB,
    "menus" TEXT[],
    "phone" TEXT NOT NULL,
    "staffAuto" JSONB,
    "staffActual" JSONB,
    "staffNote" TEXT,
    "staffSavedAt" TIMESTAMP(3),
    "paymentSlipUrl" TEXT,
    "paymentSlipUploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "shopName" TEXT NOT NULL,
    "shopNameEn" TEXT NOT NULL,
    "shopInitials" TEXT NOT NULL,
    "shopAddress" TEXT NOT NULL,
    "shopPhone" TEXT NOT NULL,
    "shopLine" TEXT NOT NULL,
    "depositRate" DOUBLE PRECISION NOT NULL,
    "deliveryFee" INTEGER NOT NULL,
    "freeDeliveryMinTables" INTEGER NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CourseItems" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseItems_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Sub_key" ON "User"("auth0Sub");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "Booking_date_idx" ON "Booking"("date");

-- CreateIndex
CREATE INDEX "_CourseItems_B_index" ON "_CourseItems"("B");

-- AddForeignKey
ALTER TABLE "PackageCourse" ADD CONSTRAINT "PackageCourse_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseItems" ADD CONSTRAINT "_CourseItems_A_fkey" FOREIGN KEY ("A") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseItems" ADD CONSTRAINT "_CourseItems_B_fkey" FOREIGN KEY ("B") REFERENCES "PackageCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
