import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { ShopsModule } from '../shops/shops.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [AuditModule, ShopsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
