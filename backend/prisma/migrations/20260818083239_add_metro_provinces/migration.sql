-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MenuItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Package" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "metroProvinces" TEXT[] DEFAULT ARRAY['กรุงเทพมหานคร', 'กทม', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'สมุทรสาคร', 'สมุทรสงคราม', 'สุพรรณบุรี', 'ราชบุรี', 'กาญจนบุรี']::TEXT[],
ALTER COLUMN "updatedAt" DROP DEFAULT;
