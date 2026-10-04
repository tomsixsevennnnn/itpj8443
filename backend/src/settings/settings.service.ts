import { createHash } from 'node:crypto'
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Prisma, type Settings } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { UploadsService } from '../uploads/uploads.service'
import type { ExpectedChannel, ExpectedReceiver, SlipReceiver } from '../slip-verify/receiver-match'
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

/** ค่าเริ่มต้น — ต้องตรงกับ DEFAULT_* ใน frontend src/documents.ts และ src/geo.ts — export ไว้ให้ ShopsService
 *  ใช้สร้างแถว Settings เริ่มต้นให้ร้านใหม่ทุกร้าน (เดิมมีแถวเดียวตายตัว id=1 ทั้งระบบตอนยังเป็นร้านเดียว) */
export const DEFAULT_SETTINGS = {
  shopName: 'ร้านพิพัฒน์โภชนา',
  shopNameEn: 'Pipat Phochana Catering',
  shopInitials: 'PP',
  shopAddress: 'อ.เมืองนครปฐม จ.นครปฐม 73000',
  shopPhone: '034-XXX-XXX',
  shopLine: '@pipatphochana',
  shopLogo: '',
  shopLoginTagline: 'ระบบจองจัดเลี้ยงนอกสถานที่',
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

/** ลายนิ้วมือของคู่ API key + Branch ID (ต้องตรงกับสูตรใน migration 20261005100000) */
export const slipOkFingerprint = (apiKey: string, branchId: string): string =>
  createHash('sha256').update(`${apiKey}|${branchId}`, 'utf8').digest('hex')

/** ข้อมูลชำระเงินของร้าน (บัญชีธนาคาร/พร้อมเพย์) — ลูกค้าเห็นเฉพาะตอนร้านเชื่อม SlipOK แล้ว */
const PAYMENT_FIELDS = ['bankName', 'bankAccountNumber', 'bankAccountName', 'promptPayId', 'promptPayFirstName', 'promptPayLastName'] as const

/** ค่า JSON ที่ควรเป็น array (null/ชนิดอื่น = array ว่าง) */
const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/** ตัดช่องว่างหัวท้าย (null/undefined = สตริงว่าง) */
const clean = (v?: string | null): string => (v ?? '').trim()

/** ค่าที่เป็นต้นทุนภายในของร้าน (ค่าแรงพนักงาน) — owner เท่านั้นที่ควรเห็น ไม่มีลูกค้าคนไหนต้องใช้ค่าพวกนี้เลย */
const OWNER_ONLY_FIELDS = [
  'wageChef',
  'wageAssistant',
  'wageServerPerTable',
  'wageDishwasher',
  'tablesPerServer',
  'tablesPerSupport',
  'staffRemainderThreshold',
  'slipOkApiKey',
  'slipOkBranchId',
  'slipOkLastReceiverName',
  'slipOkLastReceiverAccount',
  'slipOkLastReceivingBank',
  'slipOkLastReceiverMatched',
  'slipOkLastReceiverAt',
  'slipOkTestedHash',
] as const

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly uploads: UploadsService,
    private readonly realtime: RealtimeService,
  ) {}

  // เดิม cache ไว้ในหน่วยความจำ (TTL 1 วิ) กัน round-trip ไป DB ที่โฮสต์ไกล (Railway) — แต่ backend รันได้
  // หลาย process ชี้ DB เดียวกัน แก้ที่ process หนึ่งแล้ว process อื่นเห็นค่าเก่าค้างได้จนกว่า cache หมดอายุ
  // ตารางนี้อ่านไม่ถี่พอจะคุ้มเสี่ยงความไม่ตรงกันข้าม process จึงตัด cache ออก อ่าน DB ตรงทุกครั้ง
  // ปกติไม่ควร miss เลยเพราะ ShopsService.createShop สร้างแถว Settings คู่กับ Shop ไว้ตั้งแต่แรกแล้ว — fallback
  // สร้างอัตโนมัติตรงนี้ไว้กันแค่ข้อมูลเก่า/เคส edge case เท่านั้น
  private async getRaw(shopId: string): Promise<Settings> {
    const existing = await this.prisma.settings.findUnique({ where: { shopId } })
    if (existing) return existing

    // เช็คก่อนเสมอว่าร้านนี้ยังมีอยู่จริงก่อนจะ auto-create Settings ให้ — กัน FK violation (P2003) ตอน shopId
    // ไม่มีจริง (เช่นร้านถูกลบไปแล้วผ่านฟีเจอร์ลบร้านถาวร แต่ client ยังมี shopId เดิมค้างอยู่ใน localStorage/
    // query จาก session ก่อนหน้า) เดิม error นี้หลุดออกไปเป็น 500 ดิบๆ ซ้ำๆ ทุกครั้งที่ client poll
    const shopExists = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } })
    if (!shopExists) throw new NotFoundException('ไม่พบร้านนี้ — อาจถูกลบไปแล้ว')

    return this.prisma.settings.create({ data: { ...DEFAULT_SETTINGS, shopId } })
  }

  /** "เชื่อม SlipOK แล้ว" = มี API key + Branch ID และเป็นคู่เดียวกับที่ owner กดทดสอบการเชื่อมต่อผ่านล่าสุด */
  private isSlipOkConnected(s: Settings): boolean {
    return !!s.slipOkApiKey && !!s.slipOkBranchId && s.slipOkTestedHash !== '' && s.slipOkTestedHash === slipOkFingerprint(s.slipOkApiKey, s.slipOkBranchId)
  }

  /** แปลงแถวใน DB เป็นข้อมูลที่ส่งให้ client — เพิ่ม slipOkConnected และไม่ส่งลายนิ้วมือ
   *  ลูกค้าไม่เห็นค่าแรงพนักงาน/ข้อมูล SlipOK (ต้นทุนภายใน/ความลับของร้าน) และเห็นข้อมูลชำระเงินของร้านเฉพาะตอนเชื่อม SlipOK แล้ว
   *  (ยังไม่เชื่อม = ว่างเปล่า ลูกค้าไม่เห็นช่องทางโอน) */
  private toClient(settings: Settings, isOwner: boolean): Settings & { slipOkConnected: boolean } {
    const slipOkConnected = this.isSlipOkConnected(settings)
    const out = { ...settings, slipOkConnected } as Record<string, unknown>
    delete out.slipOkTestedHash
    if (!isOwner) {
      for (const field of OWNER_ONLY_FIELDS) delete out[field]
      if (!slipOkConnected) {
        for (const field of PAYMENT_FIELDS) out[field] = ''
        out.extraBankAccounts = []
        out.extraPromptPays = []
      }
    }
    return out as unknown as Settings & { slipOkConnected: boolean }
  }

  async get(shopId: string, isOwner: boolean): Promise<Settings & { slipOkConnected: boolean }> {
    return this.toClient(await this.getRaw(shopId), isOwner)
  }

  /** owner กดทดสอบการเชื่อมต่อผ่าน — จำลายนิ้วมือของคู่ key/branch ที่ทดสอบไว้ (ไม่ bump version) ถ้าคู่นี้ตรงกับที่บันทึกอยู่
   *  (ตอนนี้หรือหลังบันทึก) ก็ถือว่าเชื่อมแล้ว ตัวคำตอบของ endpoint ทดสอบไม่เปลี่ยน */
  async markSlipOkTested(shopId: string, apiKey: string, branchId: string): Promise<void> {
    try {
      await this.prisma.settings.updateMany({ where: { shopId }, data: { slipOkTestedHash: slipOkFingerprint(apiKey, branchId) } })
    } catch (err) {
      this.logger.warn(`จดผลทดสอบ SlipOK ไม่สำเร็จ (shop=${shopId})`, err as Error)
    }
  }

  /** เฉพาะข้อมูลร้านที่โชว์หน้าตาได้ — ไม่มี auth guard จึงต้องไม่รวมค่ามัดจำ/ค่าแรง/พิกัดร้าน ฯลฯ */
  async getPublicShopInfo(shopId: string) {
    const s = await this.getRaw(shopId)
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

  /** ให้ BookingsService เรียกตอนลูกค้าอัปโหลดสลิป — คืน null ถ้าร้านนี้ยังไม่ได้ตั้งค่า SlipOK ไว้ (ไม่บังคับ)
   *  แนบ depositRate มาด้วยเพื่อคำนวณยอดที่คาดว่าจะได้รับ — ลูกค้าโอนแค่ค่ามัดจำ ไม่ใช่ totalPrice เต็มจำนวน */
  async getSlipOkConfig(shopId: string): Promise<{
    apiKey: string
    branchId: string
    depositRate: number
    /** บัญชีรับเงินที่ owner ตั้งไว้ในแอป (บัญชีธนาคาร + พร้อมเพย์) ไว้เทียบกับผู้รับที่ SlipOK อ่านได้จากสลิป */
    expectedReceiver: ExpectedReceiver
  } | null> {
    const settings = await this.getRaw(shopId)
    if (!settings.slipOkApiKey || !settings.slipOkBranchId) return null
    return {
      apiKey: settings.slipOkApiKey,
      branchId: settings.slipOkBranchId,
      depositRate: settings.depositRate,
      expectedReceiver: { channels: this.paymentChannels(settings) },
    }
  }

  /** บัญชีรับเงินทั้งหมดของร้าน: บัญชีธนาคาร/พร้อมเพย์หลัก + ที่เพิ่มเติม — แต่ละบัญชีเป็น 1 channel (ชื่อกับเลขต้องเป็นของบัญชีเดียวกัน)
   *  บัญชีที่มีเลข (ลูกค้าโอนได้จริง) ได้ key/label ไว้ให้ลูกค้าเลือกตอนแนบสลิป: key = "bank:<เลขเฉพาะตัวเลข>" หรือ "pp:<เลขเฉพาะตัวเลข>" */
  paymentChannels(settings: Settings): ExpectedChannel[] {
    const digits = (v: string) => v.replace(/\D/g, '')
    const withName = (text: string, name: string) => (name ? `${text} (${name})` : text)
    const channels: ExpectedChannel[] = []

    const addBank = (bankName?: string, accountNumber?: string, accountName?: string) => {
      const number = clean(accountNumber)
      const name = clean(accountName)
      if (!number && !name) return
      const key = digits(number).length >= 4 ? `bank:${digits(number)}` : undefined
      channels.push({
        names: name ? [name] : [],
        accounts: number ? [number] : [],
        key,
        label: key ? withName([clean(bankName), number].filter(Boolean).join(' '), name) : undefined,
      })
    }
    const addPromptPay = (id?: string, firstName?: string, lastName?: string) => {
      const number = clean(id)
      const name = [firstName, lastName].map(clean).filter(Boolean).join(' ')
      if (!number && !name) return
      const key = digits(number).length >= 4 ? `pp:${digits(number)}` : undefined
      channels.push({
        names: name ? [name] : [],
        accounts: number ? [number] : [],
        key,
        label: key ? withName(`พร้อมเพย์ ${number}`, name) : undefined,
      })
    }

    addBank(settings.bankName, settings.bankAccountNumber, settings.bankAccountName)
    addPromptPay(settings.promptPayId, settings.promptPayFirstName, settings.promptPayLastName)
    for (const b of asArray<{ bankName?: string; accountNumber?: string; accountName?: string }>(settings.extraBankAccounts)) {
      addBank(b.bankName, b.accountNumber, b.accountName)
    }
    for (const p of asArray<{ id?: string; firstName?: string; lastName?: string }>(settings.extraPromptPays)) {
      addPromptPay(p.id, p.firstName, p.lastName)
    }
    return channels
  }

  /** ช่องทางโอนของร้านนี้ (ให้ BookingsService หาช่องทางที่ลูกค้าเลือกจาก key) */
  async getPaymentChannels(shopId: string): Promise<ExpectedChannel[]> {
    return this.paymentChannels(await this.getRaw(shopId))
  }

  /** จดผู้รับเงินที่ SlipOK เห็นจากสลิปล่าสุดที่ตรวจผ่านของร้านนี้ ให้หน้าตั้งค่าการเงินโชว์ — ไม่ bump version (ไม่ใช่การแก้ของ owner
   *  ไม่งั้น owner ที่กำลังแก้ฟอร์มอยู่จะชน 409 ทุกครั้งที่มีลูกค้าแนบสลิป) ไม่มีวัน throw ออกไปบล็อกการแนบสลิป */
  async recordSlipOkReceiver(shopId: string, receiver: SlipReceiver, matched: boolean | null): Promise<void> {
    try {
      await this.prisma.settings.updateMany({
        where: { shopId },
        data: {
          slipOkLastReceiverName: receiver.displayName || receiver.name,
          slipOkLastReceiverAccount: receiver.account || receiver.proxy,
          slipOkLastReceivingBank: receiver.bankCode,
          slipOkLastReceiverMatched: matched,
          slipOkLastReceiverAt: new Date(),
        },
      })
    } catch (err) {
      this.logger.warn(`จดผู้รับเงินจาก SlipOK ไม่สำเร็จ (shop=${shopId})`, err as Error)
    }
  }

  /** เปลี่ยนโลโก้ร้าน — ไฟล์เก่ากำลังจะถูกลบทิ้งกัน orphan สะสมบน disk แต่ประวัติการแก้ไข (audit log) ต้องยังดูรูปเดิม
   *  ย้อนหลังได้ เลยย่อเป็น thumbnail คุณภาพต่ำฝังไว้แทน path เดิมก่อนลบไฟล์จริงทิ้ง (แยกออกมาจาก update() กันฟังก์ชัน
   *  หลักซับซ้อนเกิน — ตัวนี้เองไม่ได้ลบไฟล์จริง แค่เตรียม before สำหรับ audit log เท่านั้น) */
  private async prepareImageReplacementAudit(dto: UpdateSettingsDto, before: Settings, after: Settings) {
    const logoReplaced = !!(dto.shopLogo !== undefined && before.shopLogo && before.shopLogo !== after.shopLogo)
    let auditBefore = before
    if (logoReplaced) {
      auditBefore = { ...auditBefore, shopLogo: (await this.uploads.makeThumbnailDataUrl(before.shopLogo)) ?? before.shopLogo }
    }
    return { auditBefore, logoReplaced }
  }

  /** เนื้อหาหน้าแรก (Hero + แกลเลอรี) — รูป Hero เก่าที่ถูกแทนที่ และรูปแกลเลอรีที่ถูกตัดออกจากรายการ ต้องลบไฟล์
   *  จริงทิ้งด้วย ไม่งั้นสะสมบน disk ไม่มีวันหมด (หน้าประวัติการแก้ไขสรุป homeContent เป็นข้อความ ไม่ได้โชว์รูปจริง
   *  อยู่แล้ว เลยไม่ต้องทำ thumbnail เหมือนโลโก้/QR/รูปเมนูด้านบน) */
  private async cleanupHomeContentImages(dto: UpdateSettingsDto, before: Settings, after: Settings) {
    if (dto.homeContent === undefined) return
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

  async update(shopId: string, dto: UpdateSettingsDto, editorAuth0Sub: string) {
    const { expectedVersion, ...patch } = dto
    const before = await this.getRaw(shopId)

    let after: Settings
    try {
      after = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.settings.update({
          where: { id_version: { id: before.id, version: expectedVersion } },
          data: { ...patch, version: { increment: 1 }, lastEditedBy: editorAuth0Sub } as any,
        })
        // ชื่อร้านภาษาไทยที่ owner แก้ในหน้าตั้งค่า ต้องซิงค์กับ Shop.name ที่ super admin เห็น กันสองหน้าโชว์ชื่อไม่ตรงกัน
        if (patch.shopName !== undefined && patch.shopName !== before.shopName) {
          await tx.shop.update({ where: { id: shopId }, data: { name: patch.shopName } })
        }
        return updated
      })
    } catch (err) {
      // P2025 = ไม่พบแถวที่ตรงเงื่อนไข where (id, version) — แปลว่ามีคนแก้ไปแล้วก่อนหน้านี้ (version ไม่ตรงที่ client ถืออยู่)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        // log ไว้ให้ไล่สาเหตุได้ — เทียบ version ที่ client ส่งมากับ version จริงใน DB ตอนนี้ (ดูได้ด้วย railway logs)
        const current = await this.prisma.settings.findUnique({ where: { id: before.id }, select: { version: true } }).catch(() => null)
        this.logger.warn(
          `settings conflict (409): shop=${shopId} editor=${editorAuth0Sub} expectedVersion=${expectedVersion} currentVersion=${current?.version ?? '?'}`,
        )
        throw new ConflictException('มีคนแก้ไขค่าตั้งค่าไปแล้ว กรุณาโหลดหน้าใหม่')
      }
      throw err
    }

    const { auditBefore, logoReplaced } = await this.prepareImageReplacementAudit(dto, before, after)
    await this.audit.log(editorAuth0Sub, 'settings.update', 'Settings', String(after.id), auditBefore, after, shopId)

    if (logoReplaced) await this.uploads.deleteManagedFile(before.shopLogo)

    await this.cleanupHomeContentImages(dto, before, after)

    // ชื่อร้านถูกซิงค์เข้า Shop.name ไปแล้วในทรานแซกชันข้างบน — แจ้งทุก client ที่เปิดอยู่ (โดยเฉพาะ super admin ที่ดูรายชื่อร้านทั้งหมด)
    // ให้ refetch รายการร้านทันที (หัวข้อ 'shop') ไม่ต้องรอ refresh/poll เพราะ audit.log ข้างบนแจ้งแค่หัวข้อ 'settings'
    if (patch.shopName !== undefined && patch.shopName !== before.shopName) this.realtime.emitAppChanged('shop')

    return this.toClient(after, true)
  }
}
