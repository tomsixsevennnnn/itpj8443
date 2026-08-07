import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { BookingStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'

/** สถานะที่ยังกินคิวอยู่ — ต้องตรงกับ OCCUPIES_QUEUE ใน frontend src/availability.ts */
const OCCUPIES_QUEUE: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED]

/** ครบจำนวนครั้งนี้แล้วยังชนกันอยู่ (เกิดยากมาก) — เลิกลองแล้วแจ้งผู้ใช้ให้กดจองใหม่เอง */
const MAX_SERIALIZATION_RETRIES = 3

const isSerializationConflict = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  findAllForOwner() {
    return this.prisma.booking.findMany({ orderBy: { createdAt: 'desc' } })
  }

  findAllForCustomer(customerId: string) {
    return this.prisma.booking.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } })
  }

  /** คิวรับงานแบบไม่มีข้อมูลส่วนตัว — ให้ลูกค้าทุกคนเช็คว่าวัน/ช่วงเวลาไหนเต็มแล้วบ้าง ไม่ใช่แค่ใบจองของตัวเอง */
  findAvailability() {
    return this.prisma.booking.findMany({
      select: { date: true, timeSlot: true, tables: true, status: true },
    })
  }

  /**
   * เลขที่ใบจอง BK-{ปี}-{เลขลำดับ} ออกจาก BookingCounter แบบ atomic ในทรานแซกชันเดียวกับการสร้างใบจอง กันเลขชนกันตอนจองพร้อมกัน
   * เช็ควันซ้อนในทรานแซกชันเดียวกันด้วย — กติกา "1 วันรับได้ 1 งาน" (ดู dayStatus ใน frontend src/availability.ts)
   *
   * รัน isolation ระดับ Serializable — Postgres จะยกเลิก transaction ที่ชนกันเองถ้าตรวจพบว่ารันพร้อมกัน
   * แล้วผลต่างจากรันทีละอัน (เช่น 2 คนเช็ค "วันนี้ว่าง" พร้อมกันเป๊ะๆ ก่อนอีกฝ่าย commit) แทนที่จะปล่อยให้จองซ้อนหลุดผ่านไปได้
   * เจอ error P2034 (serialization conflict) แปลว่าโดนยกเลิกแบบนี้ — ลองใหม่ได้ไม่กี่ครั้งก็มักผ่าน เพราะฝ่ายที่ชนะไป commit แล้ว
   */
  async create(customerId: string, customerName: string, phone: string, dto: CreateBookingDto) {
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
                packageName: dto.packageName,
                totalPrice: dto.totalPrice,
                pricePerTable: dto.pricePerTable,
                deliveryFee: dto.deliveryFee,
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

  async updateAsOwner(id: string, dto: UpdateBookingDto) {
    await this.assertExists(id)
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: dto.status,
        staffAuto: dto.staffAuto as any,
        staffActual: dto.staffActual as any,
        staffNote: dto.staffNote,
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
