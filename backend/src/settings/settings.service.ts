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
  depositRate: 0.5,
  deliveryFee: 2000,
  freeDeliveryMinTables: 30,
  wageChef: 1200,
  wageAssistant: 1000,
  wageServerPerTable: 100,
  wageDishwasher: 500,
  categoryOrder: ['snack', 'appetizer', 'soup', 'salad', 'main', 'fish', 'rice-noodle', 'hotpot', 'dessert'],
  shopLocationLat: 13.8196,
  shopLocationLng: 100.0603,
  fuelCostPerKm: 8,
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // แถวเดียว (id=1) แก้ไม่บ่อย — cache ไว้ในหน่วยความจำกัน round-trip ไป DB ที่โฮสต์ไกล (Railway)
  // ทุกครั้งที่หน้า Login/หน้าอื่นเรียก /settings ซึ่งช้ากว่า cache hit หลายเท่าตัว
  // TTL สั้นๆ (ไม่ cache ค้างตลอดไป) เพราะ backend รันได้หลาย process ชี้ DB เดียวกัน
  // (เช่น รันคนละเครื่อง) — แก้ที่ process หนึ่งแล้ว process อื่นต้องเห็นการเปลี่ยนแปลงภายในไม่กี่วินาที
  private cached: Settings | null = null
  private cachedAt = 0
  private static readonly CACHE_TTL_MS = 1000

  async get() {
    const isFresh = this.cached && Date.now() - this.cachedAt < SettingsService.CACHE_TTL_MS
    if (isFresh) return this.cached!
    const existing = await this.prisma.settings.findUnique({ where: { id: 1 } })
    this.cached = existing ?? (await this.prisma.settings.create({ data: DEFAULT_SETTINGS }))
    this.cachedAt = Date.now()
    return this.cached
  }

  /** เฉพาะข้อมูลร้านที่โชว์หน้าตาได้ — ไม่มี auth guard จึงต้องไม่รวมค่ามัดจำ/ค่าแรง/พิกัดร้าน ฯลฯ */
  async getPublicShopInfo() {
    const s = await this.get()
    return {
      shopName: s.shopName,
      shopNameEn: s.shopNameEn,
      shopInitials: s.shopInitials,
      shopAddress: s.shopAddress,
      shopPhone: s.shopPhone,
      shopLine: s.shopLine,
    }
  }

  async update(dto: UpdateSettingsDto) {
    await this.get()
    this.cached = await this.prisma.settings.update({ where: { id: 1 }, data: dto as any })
    this.cachedAt = Date.now()
    return this.cached
  }
}
