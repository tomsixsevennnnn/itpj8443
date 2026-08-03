import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { AUTH0_ROLE_CLAIM } from '../auth/auth.constants'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SyncProfileDto } from './dto/sync-profile.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersService } from './users.service'

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  /**
   * frontend เรียกทันทีหลัง login สำเร็จ — ส่ง profile จาก ID token มาเอง (access token ไม่มี
   * name/email/picture ให้ เพราะ Auth0 Action ใส่แค่ custom claim ของ role ลง token)
   */
  @Post('me')
  sync(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: SyncProfileDto) {
    const role = jwtUser[AUTH0_ROLE_CLAIM] === 'owner' ? Role.OWNER : Role.CUSTOMER
    return this.users.syncProfile(jwtUser.sub, role, dto)
  }

  /** บันทึกเบอร์โทร/Line ID ที่ Auth0 ไม่มีให้ (ดูหน้า CompleteProfile ฝั่ง frontend) */
  @Patch('me')
  updateProfile(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(jwtUser.sub, dto)
  }
}
