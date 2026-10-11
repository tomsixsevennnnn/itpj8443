import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { UploadsModule } from '../uploads/uploads.module'
import { ShopsController } from './shops.controller'
import { ShopsService } from './shops.service'

@Module({
  imports: [AuditModule, UploadsModule],
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
