-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Settings_id_version_key" ON "Settings"("id", "version");
