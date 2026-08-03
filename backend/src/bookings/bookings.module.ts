import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module'
import { BookingsController } from './bookings.controller'
import { BookingsService } from './bookings.service'

@Module({
  imports: [UsersModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
