import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { BookingStatus, Prisma } from '@prisma/client'
import { Paginated, pageArgsFor } from '../common/pagination'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'

/** สถานะที่ยังกินคิวอยู่ — ต้องตรงกับ OCCUPIES_QUEUE ใน frontend src/availability.ts */
const OCCUPIES_QUEUE: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED]

/** ครบจำนวนครั้งนี้แล้วยังชนกันอยู่ (เกิดยากมาก) — เลิกลองแล้วแจ้งผู้ใช้ให้กดจองใหม่เอง */
const MAX_SERIALIZATION_RETRIES = 3

const isSerializationConflict = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'

/** ต้องตรงกับ ServiceZone ใน frontend src/types.ts / src/geo.ts */
type ServiceZone = 'home' | 'metro' | 'outside'
const VALID_ZONES: ServiceZone[] = ['home', 'metro', 'outside']
/** กันระยะทางที่ผิดปกติเกินจริงจาก client (ไทยกว้างสุดไม่เกินราว 1,100 กม. เผื่อไว้ที่ 1,500) */
const MAX_PLAUSIBLE_DISTANCE_KM = 1500

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  /** เจ้าของร้านต้องเห็นข้อมูลบัญชีลูกค้าปัจจุบัน (ชื่อ/นามสกุล/อีเมล/LINE ID) ไม่ใช่แค่ snapshot ตอนจอง — join จาก User ที่ผูกไว้ */
  async findAllForOwner(page?: number, limit?: number) {
    const args = pageArgsFor(page, limit)
    const baseArgs = {
      orderBy: { createdAt: 'desc' as const },
      include: { customer: { select: { name: true, surname: true, email: true, lineId: true } } },
    }
    if (!args) return this.prisma.booking.findMany(baseArgs)
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({ ...baseArgs, skip: args.skip, take: args.take }),
      this.prisma.booking.count(),
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

  /** คิวรับงานแบบไม่มีข้อมูลส่วนตัว — ให้ลูกค้าทุกคนเช็คว่าวัน/ช่วงเวลาไหนเต็มแล้วบ้าง ไม่ใช่แค่ใบจองของตัวเอง */
  findAvailability() {
    return this.prisma.booking.findMany({
      select: { date: true, timeSlot: true, tables: true, status: true },
    })
  }

  private resolveZone(locationDetail: unknown): ServiceZone {
    const zone = (locationDetail as { zone?: unknown } | null)?.zone
    return typeof zone === 'string' && (VALID_ZONES as string[]).includes(zone) ? (zone as ServiceZone) : 'outside'
  }

  private resolveDistanceKm(locationDetail: unknown): number | null {
    const raw = (locationDetail as { distanceKm?: unknown } | null)?.distanceKm
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return null
    return Math.min(raw, MAX_PLAUSIBLE_DISTANCE_KM)
  }

  /** ต้องตรงกับสูตร deliveryFeeFor/outsideDeliveryFeeFor ใน frontend src/geo.ts เป๊ะ */
  private computeDeliveryFee(
    tables: number,
    zone: ServiceZone,
    distanceKm: number | null,
    settings: { deliveryFee: number; freeDeliveryMinTables: number; fuelCostPerKm: number },
  ): number {
    if (zone === 'metro') return tables < settings.freeDeliveryMinTables ? settings.deliveryFee : 0
    if (zone === 'outside' && distanceKm != null) return Math.round(distanceKm * 2 * settings.fuelCostPerKm)
    return 0
  }

  /**
   * ราคา (totalPrice/pricePerTable/deliveryFee) และชื่อแพ็กเกจ "คำนวณที่ backend เท่านั้น" — เดิมรับตรงจาก
   * client มา ซึ่งแก้ request body ผ่าน DevTools ปลอมราคาเป็นเท่าไหร่ก็ได้ ตอนนี้ดึงราคาแพ็กเกจจริงจาก DB
   * ด้วย packageId แล้วคิดค่าขนส่งด้วยสูตรเดียวกับ frontend เอง ไม่เชื่อตัวเลขใดๆ ที่ client ส่งมา
   *
   * หมายเหตุ: zone/distanceKm ของสถานที่ยังอิงจากค่าที่ client geocode มา (ยังไม่ verify พิกัดซ้ำฝั่ง
   * server) — เพดานระยะทางกันค่าที่ผิดปกติชัดเจน แต่การปลอม zone เพื่อลดค่าขนส่งยังทำได้อยู่บ้าง (ผลกระทบ
   * ทางการเงินน้อยกว่าการปลอมราคาอาหารทั้งก้อนที่เคยเกิดขึ้นมาก) — ควร verify เต็มรูปแบบเป็นงานต่อยอด
   *
   * รัน isolation ระดับ Serializable — Postgres จะยกเลิก transaction ที่ชนกันเองถ้าตรวจพบว่ารันพร้อมกัน
   * แล้วผลต่างจากรันทีละอัน (เช่น 2 คนเช็ค "วันนี้ว่าง" พร้อมกันเป๊ะๆ ก่อนอีกฝ่าย commit) แทนที่จะปล่อยให้จองซ้อนหลุดผ่านไปได้
   * เจอ error P2034 (serialization conflict) แปลว่าโดนยกเลิกแบบนี้ — ลองใหม่ได้ไม่กี่ครั้งก็มักผ่าน เพราะฝ่ายที่ชนะไป commit แล้ว
   */
  async create(customerId: string, customerName: string, phone: string, dto: CreateBookingDto) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: dto.packageId },
      include: { courses: { include: { items: true } } },
    })
    if (!pkg) throw new NotFoundException('ไม่พบแพ็กเกจนี้')

    const validMenuNames = new Set(pkg.courses.flatMap((c) => c.items.map((i) => i.name)))
    const invalidMenus = dto.menus.filter((name) => !validMenuNames.has(name))
    if (invalidMenus.length > 0) {
      throw new BadRequestException(`เมนูต่อไปนี้ไม่ได้อยู่ในแพ็กเกจที่เลือก: ${invalidMenus.join(', ')}`)
    }

    const settings = await this.settingsService.get(true)
    const zone = this.resolveZone(dto.locationDetail)
    const distanceKm = this.resolveDistanceKm(dto.locationDetail)
    const deliveryFee = this.computeDeliveryFee(dto.tables, zone, distanceKm, settings)
    const pricePerTable = pkg.pricePerTable
    const totalPrice = pricePerTable * dto.tables + deliveryFee

    const bookingYear = new Date().getFullYear()

    for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const conflict = await tx.booking.findFirst({
              where: { date: dto.date, status: { in: OCCUPIES_QUEUE } },
            })
            if (conflict) throw new ConflictException('วันที่นี้มีงานจองอยู่แล้ว ไม่สามารถจองซ้อนได้')

            const counter = await tx.bookingCounter.upsert({
              where: { year: bookingYear },
              create: { year: bookingYear, lastNo: 1 },
              update: { lastNo: { increment: 1 } },
            })
            return tx.booking.create({
              data: {
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

  async updateAsOwner(id: string, dto: UpdateBookingDto, editorAuth0Sub: string) {
    await this.assertExists(id)
    return this.prisma.booking.update({
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
  }

  async updatePaymentSlipAsCustomer(id: string, customerId: string, paymentSlipUrl: string) {
    const booking = await this.assertExists(id)
    if (booking.customerId !== customerId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขใบจองนี้')
    return this.prisma.booking.update({
      where: { id },
      data: { paymentSlipUrl, paymentSlipUploadedAt: new Date() },
    })
  }

  private async assertExists(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } })
    if (!booking) throw new NotFoundException('ไม่พบใบจองนี้')
    return booking
  }
}
