import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { SettingsModule } from '../settings/settings.module'
import { UploadsModule } from '../uploads/uploads.module'
import { UsersModule } from '../users/users.module'
import { BookingsController } from './bookings.controller'
import { BookingsService } from './bookings.service'

@Module({
  imports: [UsersModule, SettingsModule, AuditModule, UploadsModule, RealtimeModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
