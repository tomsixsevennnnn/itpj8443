-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "slipOkTestedHash" TEXT NOT NULL DEFAULT '';

-- ร้านที่ตั้ง API key + Branch ID ไว้แล้ว ถือว่าเชื่อมแล้ว (ไม่ให้ข้อมูลชำระเงินหายจากลูกค้าทันทีที่อัปเดต) —
-- ลายนิ้วมือต้องตรงกับที่ backend คำนวณ: sha256 ของข้อความ "apiKey|branchId" (UTF-8) เป็น hex
UPDATE "Settings"
SET "slipOkTestedHash" = encode(sha256(convert_to("slipOkApiKey" || '|' || "slipOkBranchId", 'UTF8')), 'hex')
WHERE "slipOkApiKey" <> '' AND "slipOkBranchId" <> '';
