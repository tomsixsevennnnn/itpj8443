import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
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

  /** ไม่ต้อง login — หน้า Login ฝั่ง frontend เรียกใช้เพื่อโชว์ชื่อร้าน/ข้อมูลติดต่อปัจจุบันก่อนเข้าสู่ระบบ */
  @Get('public')
  getPublic() {
    return this.settings.getPublicShopInfo()
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async get(@CurrentUser() jwtUser: Record<string, any>) {
    return this.settings.get(await this.users.isOwner(jwtUser.sub))
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch()
  @Roles('owner')
  update(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto, jwtUser.sub)
  }
}
