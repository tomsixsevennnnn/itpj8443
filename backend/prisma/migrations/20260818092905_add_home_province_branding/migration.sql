-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "brandColor" TEXT NOT NULL DEFAULT '#F97316',
ADD COLUMN     "homeProvince" TEXT NOT NULL DEFAULT 'นครปฐม',
ADD COLUMN     "shopLoginTagline" TEXT NOT NULL DEFAULT 'ระบบจองจัดเลี้ยงนอกสถานที่',
ADD COLUMN     "shopLogo" TEXT NOT NULL DEFAULT '';
