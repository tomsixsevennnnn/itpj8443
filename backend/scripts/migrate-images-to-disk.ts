/**
 * สคริปต์ one-off — แปลงรูปที่เก็บเป็น data URL (base64) อยู่ใน Postgres มาเก็บเป็นไฟล์บน disk ผ่าน
 * UploadsService แทน (ดู backend/src/uploads) แล้วเขียน path สั้นๆ กลับลง DB แทนค่า data URL เดิม
 *
 * รันครั้งเดียวตอน migrate ข้อมูลเก่าที่ยังฝัง base64 อยู่ใน MenuItem.image / Settings.shopLogo /
 * Settings.promptPayQr / Booking.paymentSlipUrl / Settings.homeContent (heroImage/gallery) — ข้อมูลที่สร้างใหม่
 * หลังจากนี้ผ่าน UploadsController อยู่แล้วจึงเป็นไฟล์ไม่ใช่ data URL ตั้งแต่ต้น ไม่ต้องรันซ้ำ
 *
 * รัน: pnpm --filter backend exec ts-node scripts/migrate-images-to-disk.ts
 */
import { PrismaClient } from '@prisma/client'
import { UploadsService } from '../src/uploads/uploads.service'
import type { UploadKind } from '../src/uploads/uploads.constants'

const prisma = new PrismaClient()
const uploads = new UploadsService()

const isDataUrl = (value: unknown): value is string => typeof value === 'string' && value.startsWith('data:')

async function migrateField(kind: UploadKind, value: string): Promise<string> {
  const url = await uploads.saveDataUrl(kind, value)
  console.log(`  แปลงแล้ว -> ${url}`)
  return url
}

async function migrateMenuItems() {
  const items = await prisma.menuItem.findMany({ where: { image: { startsWith: 'data:' } } })
  console.log(`MenuItem: พบ ${items.length} รายการที่ต้องแปลง`)
  for (const item of items) {
    if (!isDataUrl(item.image)) continue
    const url = await migrateField('menus', item.image)
    await prisma.menuItem.update({ where: { id: item.id }, data: { image: url } })
  }
}

async function migrateSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  if (!settings) return

  const data: Record<string, unknown> = {}

  if (isDataUrl(settings.shopLogo)) {
    console.log('Settings.shopLogo: แปลง')
    data.shopLogo = await migrateField('logo', settings.shopLogo)
  }
  if (isDataUrl(settings.promptPayQr)) {
    console.log('Settings.promptPayQr: แปลง')
    data.promptPayQr = await migrateField('qr', settings.promptPayQr)
  }

  const homeContent = settings.homeContent as { heroImage?: string; gallery?: string[] } | null
  if (homeContent) {
    let changed = false
    const next = { ...homeContent }
    if (isDataUrl(homeContent.heroImage)) {
      console.log('Settings.homeContent.heroImage: แปลง')
      next.heroImage = await migrateField('content', homeContent.heroImage)
      changed = true
    }
    if (Array.isArray(homeContent.gallery) && homeContent.gallery.some(isDataUrl)) {
      console.log(`Settings.homeContent.gallery: แปลง ${homeContent.gallery.filter(isDataUrl).length} รูป`)
      next.gallery = await Promise.all(
        homeContent.gallery.map((url) => (isDataUrl(url) ? migrateField('content', url) : Promise.resolve(url))),
      )
      changed = true
    }
    if (changed) data.homeContent = next
  }

  if (Object.keys(data).length > 0) {
    await prisma.settings.update({ where: { id: 1 }, data: data as any })
  }
}

async function migrateBookings() {
  const bookings = await prisma.booking.findMany({ where: { paymentSlipUrl: { startsWith: 'data:' } } })
  console.log(`Booking: พบ ${bookings.length} รายการที่ต้องแปลง`)
  for (const booking of bookings) {
    if (!isDataUrl(booking.paymentSlipUrl)) continue
    const url = await migrateField('slips', booking.paymentSlipUrl)
    await prisma.booking.update({ where: { id: booking.id }, data: { paymentSlipUrl: url } })
  }
}

async function main() {
  await migrateMenuItems()
  await migrateSettings()
  await migrateBookings()
  console.log('เสร็จสิ้น')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
