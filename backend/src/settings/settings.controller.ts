import { Body, Controller, ForbiddenException, Get, Patch, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UsersService } from '../users/users.service'
import { UpdateSettingsDto } from './dto/update-settings.dto'
import { SettingsService } from './settings.service'

@Controller('settings')
export class SettingsController {
  constructor(
    private settings: SettingsService,
    private users: UsersService,
  ) {}

  /** ไม่ต้อง login — หน้า Login ฝั่ง frontend เรียกใช้เพื่อโชว์ชื่อร้าน/ข้อมูลติดต่อปัจจุบันก่อนเข้าสู่ระบบ ต้อง
   *  ระบุ shopId มาด้วยเสมอ (ลูกค้าเลือกร้านจากหน้ารายชื่อร้าน/URL เฉพาะร้านก่อนถึงหน้า login ของร้านนั้น) */
  @Get('public')
  getPublic(@Query('shopId') shopId: string) {
    return this.settings.getPublicShopInfo(shopId)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async get(@CurrentUser() jwtUser: Record<string, any>) {
    const ctx = await this.users.shopContextFor(jwtUser.sub)
    if (!ctx?.shopId) throw new ForbiddenException('บัญชีนี้ยังไม่ผูกกับร้านใด')
    return this.settings.get(ctx.shopId, ctx.role === Role.OWNER)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch()
  @Roles('owner')
  async update(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: UpdateSettingsDto) {
    const ctx = await this.users.shopContextFor(jwtUser.sub)
    if (!ctx?.shopId) throw new ForbiddenException('บัญชีนี้ยังไม่ผูกกับร้านใด')
    return this.settings.update(ctx.shopId, dto, jwtUser.sub)
  }
}
