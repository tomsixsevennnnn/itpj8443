import { ConflictException, Injectable } from '@nestjs/common'
import { Prisma, type Settings } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { UploadsService } from '../uploads/uploads.service'
import { UpdateSettingsDto } from './dto/update-settings.dto'

/** ดึง path รูป Hero/แกลเลอรีออกจาก homeContent (Json ที่ไม่มี type ผูกไว้ — โครงสร้างจริงคือ HomeContent ฝั่ง
 *  frontend src/homeContent.ts) ใช้เทียบก่อน/หลังตอนอัปเดตว่ารูปไหนถูกแทนที่/ตัดออกจนต้องลบไฟล์ทิ้ง */
function homeContentImages(value: unknown): { heroImage?: string; gallery?: string[] } {
  if (value == null || typeof value !== 'object') return {}
  const v = value as Record<string, unknown>
  return {
    heroImage: typeof v.heroImage === 'string' ? v.heroImage : undefined,
    gallery: Array.isArray(v.gallery) ? v.gallery.filter((x): x is string => typeof x === 'string') : undefined,
  }
}

/** ค่าเริ่มต้น — ต้องตรงกับ DEFAULT_* ใน frontend src/documents.ts และ src/geo.ts */
const DEFAULT_SETTINGS = {
  id: 1,
  shopName: 'ร้านพิพัฒน์โภชนา',
  shopNameEn: 'Pipat Phochana Catering',
  shopInitials: 'PP',
  shopAddress: 'อ.เมืองนครปฐม จ.นครปฐม 73000',
  shopPhone: '034-XXX-XXX',
  shopLine: '@pipatphochana',
  shopLogo: '',
  shopLoginTagline: 'ระบบจองจัดเลี้ยงนอกสถานที่',
  promptPayQrFirstName: '',
  promptPayQrLastName: '',
  promptPayFirstName: '',
  promptPayLastName: '',
  depositRate: 0.5,
  deliveryFee: 2000,
  freeDeliveryMinTables: 30,
  metroProvinces: ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'สมุทรสาคร', 'สมุทรสงคราม', 'สุพรรณบุรี', 'ราชบุรี', 'กาญจนบุรี'],
  homeProvince: 'นครปฐม',
  brandColor: '#F97316',
  wageChef: 1200,
  wageAssistant: 1000,
  wageServerPerTable: 100,
  wageDishwasher: 500,
  tablesPerServer: 8,
  tablesPerSupport: 20,
  staffRemainderThreshold: 10,
  slotMorningHours: '08:00 - 12:00',
  slotNoonHours: '12:00 - 16:00',
  slotEveningHours: '17:00 - 21:00',
  quotationValidDays: 7,
  quotationTerms: ['ราคานี้รวมอุปกรณ์จัดเลี้ยง โต๊ะ เก้าอี้ และพนักงานเสิร์ฟแล้ว ไม่มีค่าบริการเพิ่ม'],
  bookingTerms: [
    'ทีมงานจะเข้าพื้นที่ก่อนเวลาเริ่มงานอย่างน้อย 2 ชั่วโมง',
    'แจ้งเปลี่ยนแปลงเมนูหรือจำนวนโต๊ะล่วงหน้าอย่างน้อย 7 วัน',
    'ยกเลิกก่อนวันงานน้อยกว่า 7 วัน ขอสงวนสิทธิ์ไม่คืนเงินมัดจำ',
  ],
  categoryOrder: ['snack', 'appetizer', 'soup', 'salad', 'main', 'fish', 'rice-noodle', 'hotpot', 'dessert'],
  closedDates: [] as string[],
  shopLocationLat: 13.8196,
  shopLocationLng: 100.0603,
  fuelCostPerKm: 8,
}

/** ค่าที่เป็นต้นทุนภายในของร้าน (ค่าแรงพนักงาน) — owner เท่านั้นที่ควรเห็น ไม่มีลูกค้าคนไหนต้องใช้ค่าพวกนี้เลย */
const OWNER_ONLY_FIELDS = [
  'wageChef',
  'wageAssistant',
  'wageServerPerTable',
  'wageDishwasher',
  'tablesPerServer',
  'tablesPerSupport',
  'staffRemainderThreshold',
] as const

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private uploads: UploadsService,
  ) {}

  // เดิม cache ไว้ในหน่วยความจำ (TTL 1 วิ) กัน round-trip ไป DB ที่โฮสต์ไกล (Railway) — แต่ backend รันได้
  // หลาย process ชี้ DB เดียวกัน แก้ที่ process หนึ่งแล้ว process อื่นเห็นค่าเก่าค้างได้จนกว่า cache หมดอายุ
  // ตารางนี้มีแถวเดียวและอ่านไม่ถี่พอจะคุ้มเสี่ยงความไม่ตรงกันข้าม process จึงตัด cache ออก อ่าน DB ตรงทุกครั้ง
  private async getRaw(): Promise<Settings> {
    const existing = await this.prisma.settings.findUnique({ where: { id: 1 } })
    return existing ?? this.prisma.settings.create({ data: DEFAULT_SETTINGS })
  }

  /** ลูกค้าไม่ควรเห็นค่าแรงพนักงาน (ต้นทุนภายใน) — เดิม endpoint นี้คืนทุกฟิลด์ให้ทุก role ที่ล็อกอินอยู่ */
  async get(isOwner: boolean): Promise<Settings> {
    const settings = await this.getRaw()
    if (isOwner) return settings
    const stripped = { ...settings }
    for (const field of OWNER_ONLY_FIELDS) delete (stripped as Record<string, unknown>)[field]
    return stripped
  }

  /** เฉพาะข้อมูลร้านที่โชว์หน้าตาได้ — ไม่มี auth guard จึงต้องไม่รวมค่ามัดจำ/ค่าแรง/พิกัดร้าน ฯลฯ */
  async getPublicShopInfo() {
    const s = await this.getRaw()
    return {
      shopName: s.shopName,
      shopNameEn: s.shopNameEn,
      shopInitials: s.shopInitials,
      shopAddress: s.shopAddress,
      shopPhone: s.shopPhone,
      shopLine: s.shopLine,
      shopLogo: s.shopLogo,
      shopLoginTagline: s.shopLoginTagline,
      brandColor: s.brandColor,
    }
  }

  async update(dto: UpdateSettingsDto, editorAuth0Sub: string) {
    const { expectedVersion, ...patch } = dto
    const before = await this.getRaw()

    let after: Settings
    try {
      after = await this.prisma.settings.update({
        where: { id_version: { id: 1, version: expectedVersion } },
        data: { ...patch, version: { increment: 1 }, lastEditedBy: editorAuth0Sub } as any,
      })
    } catch (err) {
      // P2025 = ไม่พบแถวที่ตรงเงื่อนไข where (id, version) — แปลว่ามีคนแก้ไปแล้วก่อนหน้านี้ (version ไม่ตรงที่ client ถืออยู่)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new ConflictException('มีคนแก้ไขค่าตั้งค่าไปแล้ว กรุณาโหลดหน้าใหม่')
      }
      throw err
    }

    // เปลี่ยนโลโก้ร้าน/QR พร้อมเพย์ — ไฟล์เก่ากำลังจะถูกลบทิ้งกัน orphan สะสมบน disk แต่ประวัติการแก้ไข (audit log)
    // ต้องยังดูรูปเดิมย้อนหลังได้ เลยย่อเป็น thumbnail คุณภาพต่ำฝังไว้แทน path เดิมก่อนลบไฟล์จริงทิ้ง
    const logoReplaced = !!(dto.shopLogo !== undefined && before.shopLogo && before.shopLogo !== after.shopLogo)
    const qrReplaced = !!(dto.promptPayQr !== undefined && before.promptPayQr && before.promptPayQr !== after.promptPayQr)
    let auditBefore = before
    if (logoReplaced) {
      auditBefore = { ...auditBefore, shopLogo: (await this.uploads.makeThumbnailDataUrl(before.shopLogo)) ?? before.shopLogo }
    }
    if (qrReplaced) {
      auditBefore = { ...auditBefore, promptPayQr: (await this.uploads.makeThumbnailDataUrl(before.promptPayQr)) ?? before.promptPayQr }
    }
    await this.audit.log(editorAuth0Sub, 'settings.update', 'Settings', String(after.id), auditBefore, after)

    if (logoReplaced) await this.uploads.deleteManagedFile(before.shopLogo)
    if (qrReplaced) await this.uploads.deleteManagedFile(before.promptPayQr)

    // เนื้อหาหน้าแรก (Hero + แกลเลอรี) — รูป Hero เก่าที่ถูกแทนที่ และรูปแกลเลอรีที่ถูกตัดออกจากรายการ ต้องลบไฟล์
    // จริงทิ้งด้วย ไม่งั้นสะสมบน disk ไม่มีวันหมด (หน้าประวัติการแก้ไขสรุป homeContent เป็นข้อความ ไม่ได้โชว์รูปจริง
    // อยู่แล้ว เลยไม่ต้องทำ thumbnail เหมือนโลโก้/QR/รูปเมนูด้านบน)
    if (dto.homeContent !== undefined) {
      const beforeImages = homeContentImages(before.homeContent)
      const afterImages = homeContentImages(after.homeContent)
      if (beforeImages.heroImage && beforeImages.heroImage !== afterImages.heroImage) {
        await this.uploads.deleteManagedFile(beforeImages.heroImage)
      }
      const afterGallerySet = new Set(afterImages.gallery ?? [])
      for (const img of beforeImages.gallery ?? []) {
        if (!afterGallerySet.has(img)) await this.uploads.deleteManagedFile(img)
      }
    }

    return after
  }
}
