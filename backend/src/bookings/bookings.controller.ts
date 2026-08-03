import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { AUTH0_ROLE_CLAIM } from '../auth/auth.constants'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
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

  /** owner เห็นทุกใบจอง, customer เห็นเฉพาะของตัวเอง */
  @Get()
  async findAll(@CurrentUser() jwtUser: Record<string, any>) {
    if (jwtUser[AUTH0_ROLE_CLAIM] === 'owner') return this.bookings.findAllForOwner()

    const user = await this.syncCustomer(jwtUser)
    return this.bookings.findAllForCustomer(user.id)
  }

  @Post()
  @Roles('customer')
  async create(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: CreateBookingDto) {
    const user = await this.syncCustomer(jwtUser)
    return this.bookings.create(user.id, `${user.name} ${user.surname}`.trim(), user.phone, dto)
  }

  @Patch(':id')
  @Roles('owner')
  updateAsOwner(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookings.updateAsOwner(id, dto)
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
