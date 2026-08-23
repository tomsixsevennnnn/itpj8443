import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { UploadsModule } from '../uploads/uploads.module'
import { UsersModule } from '../users/users.module'
import { MenusController } from './menus.controller'
import { MenusService } from './menus.service'

@Module({
  imports: [UsersModule, AuditModule, UploadsModule],
  controllers: [MenusController],
  providers: [MenusService],
})
export class MenusModule {}
