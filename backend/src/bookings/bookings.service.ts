import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { BookingStatus, Prisma } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { Paginated, pageArgsFor } from '../common/pagination'
import { PrismaService } from '../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import { SettingsService } from '../settings/settings.service'
import { UploadsService } from '../uploads/uploads.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'
import { outsideDeliveryFeeFor, routeDistanceKm, zoneFor, ServiceZone } from './geo.util'

/** สถานะที่ยังกินคิวอยู่ — ต้องตรงกับ OCCUPIES_QUEUE ใน frontend src/availability.ts */
const OCCUPIES_QUEUE: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED]

/** ครบจำนวนครั้งนี้แล้วยังชนกันอยู่ (เกิดยากมาก) — เลิกลองแล้วแจ้งผู้ใช้ให้กดจองใหม่เอง */
const MAX_SERIALIZATION_RETRIES = 3

const isSerializationConflict = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private audit: AuditService,
    private uploads: UploadsService,
    private realtime: RealtimeService,
  ) {}

  /** เจ้าของร้านต้องเห็นข้อมูลบัญชีลูกค้าปัจจุบัน (ชื่อ/นามสกุล/อีเมล/LINE ID) ไม่ใช่แค่ snapshot ตอนจอง — join จาก User ที่ผูกไว้
   *  เห็นเฉพาะใบจองของร้านตัวเองเท่านั้น (multi-tenant) */
  async findAllForOwner(shopId: string, page?: number, limit?: number) {
    const args = pageArgsFor(page, limit)
    const baseArgs = {
      where: { shopId },
      orderBy: { createdAt: 'desc' as const },
      include: { customer: { select: { name: true, surname: true, email: true, lineId: true } } },
    }
    if (!args) return this.prisma.booking.findMany(baseArgs)
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({ ...baseArgs, skip: args.skip, take: args.take }),
      this.prisma.booking.count({ where: { shopId } }),
    ])
    return { data, total, page: args.page, limit: args.limit } satisfies Paginated<unknown>
  }

  async findAllForCustomer(customerId: string, page?: number, limit?: number) {
    const args = pageArgsFor(page, limit)
    const baseArgs = { where: { customerId }, orderBy: { createdAt: 'desc' as const } }
    if (!args) return this.prisma.booking.findMany(baseArgs)
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({ ...baseArgs, skip: args.skip, take: args.take }),
      this.prisma.booking.count({ where: { customerId } }),
    ])
    return { data, total, page: args.page, limit: args.limit } satisfies Paginated<unknown>
  }

  /** คิวรับงานแบบไม่มีข้อมูลส่วนตัว — ให้ลูกค้าทุกคนเช็คว่าวัน/ช่วงเวลาไหนของร้านนี้เต็มแล้วบ้าง ไม่ใช่แค่ใบจองของตัวเอง
   *  scope ตาม shopId เสมอ (ร้าน A เต็มวันไหน ไม่กระทบปฏิทินของร้าน B เลย) */
  findAvailability(shopId: string) {
    return this.prisma.booking.findMany({
      where: { shopId },
      select: { date: true, timeSlot: true, tables: true, status: true },
    })
  }

  /**
   * โซน/ค่าขนส่งของสถานที่งาน คำนวณเองฝั่ง backend ทั้งหมด ไม่เชื่อ zone/distanceKm ที่ client ส่งมาใน
   * locationDetail เลย (ก่อนหน้านี้เชื่อ zone จาก client + เพดานระยะทางกันแค่ค่าที่ผิดปกติชัดๆ ยังปลอม zone
   * เพื่อลดค่าขนส่งได้อยู่บ้าง) — หา zone จากข้อความ province/address เอง แล้วเรียก OSRM เองสำหรับ zone
   * นอกพื้นที่ แทนการอ่านตัวเลขที่ client คำนวณมา
   */
  private async deliveryFeeFor(
    tables: number,
    locationDetail: unknown,
    settings: {
      deliveryFee: number
      freeDeliveryMinTables: number
      fuelCostPerKm: number
      metroProvinces: string[]
      homeProvince: string
      shopLocationLat: number
      shopLocationLng: number
    },
  ): Promise<{ fee: number; zone: ServiceZone; distanceKm?: number }> {
    const loc = locationDetail as { province?: unknown; address?: unknown; lat?: unknown; lng?: unknown } | null
    if (!loc) return { fee: 0, zone: 'home' }

    const province = typeof loc.province === 'string' ? loc.province : ''
    const address = typeof loc.address === 'string' ? loc.address : ''
    const zone = zoneFor(province, address, settings.metroProvinces, settings.homeProvince)
    if (zone === 'home') return { fee: 0, zone }
    if (zone === 'metro') {
      const fee = tables < settings.freeDeliveryMinTables ? settings.deliveryFee : 0
      return { fee, zone }
    }

    // zone === 'outside' — ต้อง verify ระยะทางจริงเอง ห้าม fallback ไปเชื่อ distanceKm จาก client
    const lat = typeof loc.lat === 'number' ? loc.lat : NaN
    const lng = typeof loc.lng === 'number' ? loc.lng : NaN
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('ไม่พบพิกัดสถานที่จัดงาน กรุณาเลือกตำแหน่งบนแผนที่ใหม่')
    }

    let distanceKm: number
    try {
      distanceKm = await routeDistanceKm(
        { lat: settings.shopLocationLat, lng: settings.shopLocationLng },
        { lat, lng },
      )
    } catch {
      throw new ServiceUnavailableException('คำนวณระยะทางไปสถานที่จัดงานไม่สำเร็จ กรุณาลองจองใหม่อีกครั้ง')
    }

    return { fee: outsideDeliveryFeeFor(distanceKm, settings.fuelCostPerKm), zone, distanceKm }
  }

  /**
   * ราคา (totalPrice/pricePerTable/deliveryFee) และชื่อแพ็กเกจ "คำนวณที่ backend เท่านั้น" — เดิมรับตรงจาก
   * client มา ซึ่งแก้ request body ผ่าน DevTools ปลอมราคาเป็นเท่าไหร่ก็ได้ ตอนนี้ดึงราคาแพ็กเกจจริงจาก DB
   * ด้วย packageId แล้วคิดค่าขนส่งจาก zone/ระยะทางที่คำนวณเองฝั่ง backend (ดู deliveryFeeFor) ไม่เชื่อตัวเลข
   * ใดๆ ที่ client ส่งมาเลย ทั้งราคาอาหารและค่าขนส่ง
   *
   * รัน isolation ระดับ Serializable — Postgres จะยกเลิก transaction ที่ชนกันเองถ้าตรวจพบว่ารันพร้อมกัน
   * แล้วผลต่างจากรันทีละอัน (เช่น 2 คนเช็ค "วันนี้ว่าง" พร้อมกันเป๊ะๆ ก่อนอีกฝ่าย commit) แทนที่จะปล่อยให้จองซ้อนหลุดผ่านไปได้
   * เจอ error P2034 (serialization conflict) แปลว่าโดนยกเลิกแบบนี้ — ลองใหม่ได้ไม่กี่ครั้งก็มักผ่าน เพราะฝ่ายที่ชนะไป commit แล้ว
   */
  async create(customerId: string, customerName: string, phone: string, dto: CreateBookingDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } })
    if (!shop || shop.status !== 'ACTIVE') throw new NotFoundException('ไม่พบร้านนี้ หรือร้านปิดให้บริการชั่วคราว')

    // เมนู/แพ็กเกจต้องเป็นของร้านเดียวกับ shopId ที่จอง — กันเลือกแพ็กเกจ/เมนูข้ามร้านผ่าน id ตรงๆ
    const pkg = await this.prisma.package.findUnique({
      where: { id: dto.packageId },
      include: { courses: { include: { items: true } } },
    })
    if (!pkg || pkg.deletedAt || pkg.shopId !== dto.shopId) throw new NotFoundException('ไม่พบแพ็กเกจนี้')

    const validMenuNames = new Set(pkg.courses.flatMap((c) => c.items.map((i) => i.name)))
    const invalidMenus = dto.menus.filter((name) => !validMenuNames.has(name))
    if (invalidMenus.length > 0) {
      throw new BadRequestException(`เมนูต่อไปนี้ไม่ได้อยู่ในแพ็กเกจที่เลือก: ${invalidMenus.join(', ')}`)
    }

    const settings = await this.settingsService.get(dto.shopId, true)
    if (settings.closedDates.includes(dto.date)) {
      throw new BadRequestException('วันที่เลือกร้านปิด ไม่รับจอง กรุณาเลือกวันอื่น')
    }
    const { fee: deliveryFee } = await this.deliveryFeeFor(dto.tables, dto.locationDetail, settings)
    const pricePerTable = pkg.pricePerTable
    const totalPrice = pricePerTable * dto.tables + deliveryFee

    const bookingYear = new Date().getFullYear()

    for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
      try {
        const created = await this.prisma.$transaction(
          async (tx) => {
            // เช็คชนกันเฉพาะภายในร้านเดียวกัน — ร้าน A กับร้าน B จัดงานวันเดียวกันได้ตามปกติ ทีมงาน/รถแยกกันคนละร้าน
            const conflict = await tx.booking.findFirst({
              where: { shopId: dto.shopId, date: dto.date, status: { in: OCCUPIES_QUEUE } },
            })
            if (conflict) throw new ConflictException('วันที่นี้มีงานจองอยู่แล้ว ไม่สามารถจองซ้อนได้')

            const counter = await tx.bookingCounter.upsert({
              where: { shopId_year: { shopId: dto.shopId, year: bookingYear } },
              create: { shopId: dto.shopId, year: bookingYear, lastNo: 1 },
              update: { lastNo: { increment: 1 } },
            })
            return tx.booking.create({
              data: {
                shopId: dto.shopId,
                customerId,
                customerName,
                phone,
                bookingYear,
                bookingNo: counter.lastNo,
                date: dto.date,
                timeSlot: dto.timeSlot,
                tables: dto.tables,
                guestCount: dto.guestCount,
                packageName: pkg.name,
                totalPrice,
                pricePerTable,
                deliveryFee,
                location: dto.location,
                locationDetail: dto.locationDetail as any,
                menus: dto.menus,
                lineId: dto.lineId,
              },
            })
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        )
        this.realtime.emitBookingsChanged()
        return created
      } catch (err) {
        if (!isSerializationConflict(err)) throw err
        if (attempt === MAX_SERIALIZATION_RETRIES) {
          throw new ConflictException('ระบบมีผู้ใช้งานพร้อมกันจำนวนมาก กรุณาลองจองใหม่อีกครั้ง')
        }
        // ไม่ throw — ลูปต่อไปลองรอบถัดไป
      }
    }
    // ไม่ควรมาถึงจุดนี้ได้จริง (ทุก path ใน loop คืนค่า/throw ไปแล้ว) — กัน TypeScript ฟ้อง missing return
    throw new ConflictException('ระบบมีผู้ใช้งานพร้อมกันจำนวนมาก กรุณาลองจองใหม่อีกครั้ง')
  }

  async updateAsOwner(id: string, dto: UpdateBookingDto, editorAuth0Sub: string, shopId: string) {
    const before = await this.assertOwnedByShop(id, shopId)
    const after = await this.prisma.booking.update({
      where: { id },
      data: {
        status: dto.status,
        staffAuto: dto.staffAuto as any,
        staffActual: dto.staffActual as any,
        staffNote: dto.staffNote,
        lastEditedBy: editorAuth0Sub,
        ...(dto.staffActual ? { staffSavedAt: new Date() } : {}),
      },
    })
    await this.audit.log(editorAuth0Sub, 'booking.update', 'Booking', id, before, after, shopId)
    this.realtime.emitBookingsChanged()
    return after
  }

  async updatePaymentSlipAsCustomer(id: string, customerId: string, paymentSlipUrl: string) {
    const booking = await this.assertExists(id)
    if (booking.customerId !== customerId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขใบจองนี้')
    const after = await this.prisma.booking.update({
      where: { id },
      data: { paymentSlipUrl, paymentSlipUploadedAt: new Date() },
    })
    // แนบสลิปใหม่ทับของเดิม (เช่นโอนผิดแล้วอัปโหลดใหม่) — ลบไฟล์เก่าทิ้งกัน orphan สะสมบน disk
    if (booking.paymentSlipUrl && booking.paymentSlipUrl !== after.paymentSlipUrl) {
      await this.uploads.deleteManagedFile(booking.paymentSlipUrl)
    }
    this.realtime.emitBookingsChanged()
    return after
  }

  /**
   * สลิปโอนเงินเป็นข้อมูลอ่อนไหว (บัญชี/ยอดโอนของลูกค้า) — ต้องไม่ใช่ static asset สาธารณะ
   * ให้เห็นเฉพาะเจ้าของใบจองนั้นกับ owner ร้านเท่านั้น ดู bookings.controller.ts GET :id/payment-slip
   */
  async getPaymentSlipPath(id: string, requesterId: string, isOwner: boolean, ownerShopId: string | null): Promise<string> {
    const booking = await this.assertExists(id)
    if (isOwner) {
      if (booking.shopId !== ownerShopId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงไฟล์นี้')
    } else if (booking.customerId !== requesterId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงไฟล์นี้')
    }
    if (!booking.paymentSlipUrl) throw new NotFoundException('ยังไม่มีสลิปโอนเงินสำหรับใบจองนี้')

    const path = this.uploads.resolveManagedFilePath(booking.paymentSlipUrl)
    if (!path) throw new NotFoundException('ไม่พบไฟล์สลิปโอนเงิน')
    return path
  }

  private async assertExists(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } })
    if (!booking) throw new NotFoundException('ไม่พบใบจองนี้')
    return booking
  }

  /** ต้องเช็คว่าใบจองนี้เป็นของร้านที่ owner สังกัดอยู่จริงก่อนทุกครั้ง กัน owner ร้าน A แก้ใบจองร้าน B ผ่าน id ตรงๆ */
  private async assertOwnedByShop(id: string, shopId: string) {
    const booking = await this.assertExists(id)
    if (booking.shopId !== shopId) throw new NotFoundException('ไม่พบใบจองนี้')
    return booking
  }
}
