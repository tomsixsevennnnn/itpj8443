import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { UsersModule } from '../users/users.module'
import { PackagesController } from './packages.controller'
import { PackagesService } from './packages.service'

@Module({
  imports: [UsersModule, AuditModule],
  controllers: [PackagesController],
  providers: [PackagesService],
})
export class PackagesModule {}
