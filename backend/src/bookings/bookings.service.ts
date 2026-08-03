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

  create(customerId: string, customerName: string, phone: string, dto: CreateBookingDto) {
    return this.prisma.booking.create({
      data: {
        customerId,
        customerName,
        phone,
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
