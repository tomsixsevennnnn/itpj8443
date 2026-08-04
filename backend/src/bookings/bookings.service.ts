import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'

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

  /** เลขที่ใบจอง BK-{ปี}-{เลขลำดับ} ออกจาก BookingCounter แบบ atomic ในทรานแซกชันเดียวกับการสร้างใบจอง กันเลขชนกันตอนจองพร้อมกัน */
  create(customerId: string, customerName: string, phone: string, dto: CreateBookingDto) {
    const bookingYear = new Date().getFullYear()
    return this.prisma.$transaction(async (tx) => {
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
    })
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
