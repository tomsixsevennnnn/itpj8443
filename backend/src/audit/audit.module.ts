import { Module } from '@nestjs/common'
import { RealtimeModule } from '../realtime/realtime.module'
import { AuditController } from './audit.controller'
import { AuditService } from './audit.service'

@Module({
  imports: [RealtimeModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
