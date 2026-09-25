import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import { Role } from '@prisma/client'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ListQueryDto } from '../common/list-query.dto'
import { UsersService } from '../users/users.service'
import { BookingsService } from './bookings.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'
import { UpdatePaymentSlipDto } from './dto/update-payment-slip.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(
    private bookings: BookingsService,
    private users: UsersService,
  ) {}

  /** owner เห็นทุกใบจองของร้านตัวเอง, customer เห็นใบจองของตัวเอง (ข้ามทุกร้าน) — ไม่ส่ง page/limit มา = คืน array เต็มเหมือนเดิม */
  @Get()
  async findAll(@CurrentUser() jwtUser: Record<string, any>, @Query() query: ListQueryDto) {
    const ctx = await this.users.shopContextFor(jwtUser.sub)
    if (ctx?.role === Role.OWNER) {
      if (!ctx.shopId) throw new ForbiddenException('บัญชีนี้ยังไม่ผูกกับร้านใด')
      return this.bookings.findAllForOwner(ctx.shopId, query.page, query.limit)
    }

    const user = await this.syncCustomer(jwtUser)
    return this.bookings.findAllForCustomer(user.id, query.page, query.limit)
  }

  /** คิวรับงานของร้านเดียว (ไม่มีข้อมูลส่วนตัว) — ใช้เช็ควัน/ช่วงเวลาที่เต็มแล้วตอนลูกค้าเลือกวันจัดงาน
   *  ต้องระบุ shopId เสมอ (ลูกค้าเลือกร้านมาก่อนแล้วจากหน้ารายชื่อร้าน) */
  @Get('availability')
  findAvailability(@Query('shopId') shopId: string) {
    return this.bookings.findAvailability(shopId)
  }

  // เข้มกว่า default ของทั้ง API (60/นาที) — สร้างใบจองไม่ควรมีใครยิงถี่ขนาดนั้นได้ตามปกติ กันสแปมใบจองปลอม
  @Post()
  @Roles('customer')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: CreateBookingDto) {
    const user = await this.syncCustomer(jwtUser)
    return this.bookings.create(user.id, `${user.name} ${user.surname}`.trim(), user.phone, dto)
  }

  @Patch(':id')
  @Roles('owner')
  async updateAsOwner(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: UpdateBookingDto) {
    const ctx = await this.users.shopContextFor(jwtUser.sub)
    if (!ctx?.shopId) throw new ForbiddenException('บัญชีนี้ยังไม่ผูกกับร้านใด')
    return this.bookings.updateAsOwner(id, dto, jwtUser.sub, ctx.shopId)
  }

  @Patch(':id/payment-slip')
  @Roles('customer')
  async uploadSlip(
    @CurrentUser() jwtUser: Record<string, any>,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentSlipDto,
  ) {
    const user = await this.syncCustomer(jwtUser)
    return this.bookings.updatePaymentSlipAsCustomer(id, user.id, dto.paymentSlipUrl)
  }

  /**
   * ไม่ผ่าน @Roles — ทั้ง owner และลูกค้าเจ้าของใบจองนั้นดูได้ ตรวจสิทธิ์รายใบจองเองใน service แทน
   * ไฟล์สลิปไม่ใช่ static asset สาธารณะ (ดู main.ts) ต้องผ่าน endpoint นี้เท่านั้นถึงจะอ่านได้
   */
  @Get(':id/payment-slip')
  async getSlip(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Res() res: Response) {
    const ctx = await this.users.shopContextFor(jwtUser.sub)
    const isOwner = ctx?.role === Role.OWNER
    const requesterId = isOwner ? '' : (await this.syncCustomer(jwtUser)).id
    const path = await this.bookings.getPaymentSlipPath(id, requesterId, isOwner, ctx?.shopId ?? null)
    res.sendFile(path)
  }

  private syncCustomer(jwtUser: Record<string, any>) {
    return this.users.findOrCreate({
      auth0Sub: jwtUser.sub,
      role: Role.CUSTOMER,
      name: jwtUser.given_name ?? jwtUser.name ?? 'ผู้ใช้',
      surname: jwtUser.family_name ?? '',
      email: jwtUser.email ?? '',
      avatar: jwtUser.picture ?? '',
    })
  }
}
