import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from './audit.service'

/** ประวัติการลบเมนู/แพ็กเกจและแก้ไข booking/settings — owner เห็นแค่ร้านตัวเอง, super admin เห็นข้ามทุกร้าน
 *  ดึง shop context ตรงจาก PrismaService เอง (ไม่พึ่ง UsersService) กัน circular module dependency กับ UsersModule
 *  ที่ import AuditModule อยู่แล้ว */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-log')
export class AuditController {
  constructor(
    private audit: AuditService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @Roles('owner', 'super_admin')
  async findPage(@CurrentUser() jwtUser: Record<string, any>, @Query('page') pageQ?: string, @Query('pageSize') pageSizeQ?: string) {
    const page = Math.max(1, Number(pageQ) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeQ) || 20))
    const editor = await this.prisma.user.findUnique({ where: { auth0Sub: jwtUser.sub }, select: { role: true, shopId: true } })
    const shopId = editor?.role === Role.SUPER_ADMIN ? null : (editor?.shopId ?? null)
    return this.audit.findPage(page, pageSize, shopId)
  }
}
