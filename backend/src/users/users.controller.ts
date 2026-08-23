import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { AUTH0_ROLE_CLAIM } from '../auth/auth.constants'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { SearchUsersDto } from './dto/search-users.dto'
import { SetRoleDto } from './dto/set-role.dto'
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

  /** ค้นหา user ที่เคย login เข้าระบบมาก่อนอย่างน้อย 1 ครั้ง ด้วยอีเมล — หน้า "สิทธิ์การเข้าถึง" ของ owner */
  @UseGuards(RolesGuard)
  @Roles('owner')
  @Get('search')
  search(@Query() query: SearchUsersDto) {
    return this.users.searchByEmail(query.email)
  }

  /** รายชื่อ owner ทั้งหมดตอนนี้ */
  @UseGuards(RolesGuard)
  @Roles('owner')
  @Get('owners')
  owners() {
    return this.users.listOwners()
  }

  /** เลื่อน/ถอดสิทธิ์เจ้าของร้าน — ทำได้จากในแอปแทนการเข้า Auth0 dashboard */
  @UseGuards(RolesGuard)
  @Roles('owner')
  @Patch(':id/role')
  setRole(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: SetRoleDto) {
    return this.users.setRole(id, dto.role, jwtUser.sub)
  }
}
