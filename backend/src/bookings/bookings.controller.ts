import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Role } from '@prisma/client'
import { AUTH0_ROLE_CLAIM } from '../auth/auth.constants'
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

  /** owner เห็นทุกใบจอง, customer เห็นเฉพาะของตัวเอง — ไม่ส่ง page/limit มา = คืน array เต็มเหมือนเดิม */
  @Get()
  async findAll(@CurrentUser() jwtUser: Record<string, any>, @Query() query: ListQueryDto) {
    if (jwtUser[AUTH0_ROLE_CLAIM] === 'owner') return this.bookings.findAllForOwner(query.page, query.limit)

    const user = await this.syncCustomer(jwtUser)
    return this.bookings.findAllForCustomer(user.id, query.page, query.limit)
  }

  /** คิวรับงานทุกใบจอง (ไม่มีข้อมูลส่วนตัว) — ใช้เช็ควัน/ช่วงเวลาที่เต็มแล้วตอนลูกค้าเลือกวันจัดงาน */
  @Get('availability')
  findAvailability() {
    return this.bookings.findAvailability()
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
  updateAsOwner(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookings.updateAsOwner(id, dto, jwtUser.sub)
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
