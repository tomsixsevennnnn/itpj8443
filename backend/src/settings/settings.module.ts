import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { SlipVerifyModule } from '../slip-verify/slip-verify.module'
import { UploadsModule } from '../uploads/uploads.module'
import { UsersModule } from '../users/users.module'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

@Module({
  imports: [UsersModule, AuditModule, UploadsModule, SlipVerifyModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
