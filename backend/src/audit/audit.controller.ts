import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { AuditService } from './audit.service'

/** ประวัติการลบเมนู/แพ็กเกจและแก้ไข booking/settings โดย owner — owner ดูย้อนหลังได้ว่าใครแก้อะไรเมื่อไหร่ */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-log')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @Roles('owner')
  findPage(@Query('page') pageQ?: string, @Query('pageSize') pageSizeQ?: string) {
    const page = Math.max(1, Number(pageQ) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeQ) || 20))
    return this.audit.findPage(page, pageSize)
  }
}
