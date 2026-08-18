-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "bookingTerms" TEXT[] DEFAULT ARRAY['ทีมงานจะเข้าพื้นที่ก่อนเวลาเริ่มงานอย่างน้อย 2 ชั่วโมง', 'แจ้งเปลี่ยนแปลงเมนูหรือจำนวนโต๊ะล่วงหน้าอย่างน้อย 7 วัน', 'ยกเลิกก่อนวันงานน้อยกว่า 7 วัน ขอสงวนสิทธิ์ไม่คืนเงินมัดจำ']::TEXT[],
ADD COLUMN     "categories" JSONB,
ADD COLUMN     "quotationTerms" TEXT[] DEFAULT ARRAY['ราคานี้รวมอุปกรณ์จัดเลี้ยง โต๊ะ เก้าอี้ และพนักงานเสิร์ฟแล้ว ไม่มีค่าบริการเพิ่ม']::TEXT[],
ADD COLUMN     "quotationValidDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "slotEveningHours" TEXT NOT NULL DEFAULT '17:00 - 21:00',
ADD COLUMN     "slotMorningHours" TEXT NOT NULL DEFAULT '08:00 - 12:00',
ADD COLUMN     "slotNoonHours" TEXT NOT NULL DEFAULT '12:00 - 16:00',
ADD COLUMN     "staffRemainderThreshold" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "tablesPerServer" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "tablesPerSupport" INTEGER NOT NULL DEFAULT 20;
