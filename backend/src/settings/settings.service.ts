import { Injectable } from '@nestjs/common'
import type { Settings } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateSettingsDto } from './dto/update-settings.dto'

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
  constructor(private prisma: PrismaService) {}

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
    await this.getRaw()
    return this.prisma.settings.update({
      where: { id: 1 },
      data: { ...dto, lastEditedBy: editorAuth0Sub } as any,
    })
  }
}
