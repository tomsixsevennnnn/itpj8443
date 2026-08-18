import { Module } from '@nestjs/common'
import { SettingsModule } from '../settings/settings.module'
import { UsersModule } from '../users/users.module'
import { BookingsController } from './bookings.controller'
import { BookingsService } from './bookings.service'

@Module({
  imports: [UsersModule, SettingsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
