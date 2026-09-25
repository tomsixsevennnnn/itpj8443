import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Role } from '@prisma/client'
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
   * name/email/picture ให้) ผู้ใช้ใหม่ทุกคนเริ่มเป็น CUSTOMER เสมอ (เดิมเช็ค Auth0 connection claim
   * ให้เป็น owner อัตโนมัติ — ใช้ไม่ได้อีกต่อไปในระบบ multi-tenant เพราะ OWNER ต้องผูกกับร้านที่ super admin
   * เป็นคนสร้าง/มอบหมายให้เท่านั้น ดู ShopsService.createShop) ยกเว้นอีเมลใน SUPER_ADMIN_EMAILS ที่ syncProfile
   * เช็คเองแล้วตั้งเป็น SUPER_ADMIN ให้ตอนสร้างครั้งแรก
   */
  // จำกัดแรงกว่า global default (60/min ที่ app.module.ts) เพราะ endpoint นี้ยิงทุกครั้งที่ login — ไม่ควรมีใคร
  // เรียกถี่ขนาดนั้นตามปกติ กันยิงรัวๆ โดยไม่จำเป็น
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('me')
  sync(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: SyncProfileDto) {
    return this.users.syncProfile(jwtUser.sub, Role.CUSTOMER, dto)
  }

  /** บันทึกเบอร์โทร/Line ID ที่ Auth0 ไม่มีให้ (ดูหน้า CompleteProfile ฝั่ง frontend) */
  @Patch('me')
  updateProfile(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(jwtUser.sub, dto)
  }

  /** ค้นหา user ที่เคย login เข้าระบบมาก่อนอย่างน้อย 1 ครั้ง ด้วยอีเมล — หน้า "สิทธิ์การเข้าถึง" ของ owner
   *  (หา staff มาเชิญเข้าร้านตัวเอง) และหน้าจัดการร้านของ super admin (หา owner คนแรกตอนสร้างร้านใหม่) */
  @UseGuards(RolesGuard)
  @Roles('owner', 'super_admin')
  @Get('search')
  search(@Query() query: SearchUsersDto) {
    return this.users.searchByEmail(query.email)
  }

  /** owner ทั้งหมด — owner เห็นแค่ร้านตัวเอง, super admin เห็นข้ามทุกร้านพร้อมข้อมูลร้าน */
  @UseGuards(RolesGuard)
  @Roles('owner', 'super_admin')
  async owners(@CurrentUser() jwtUser: Record<string, any>) {
    const editor = await this.users.shopContextFor(jwtUser.sub)
    if (editor?.role === Role.SUPER_ADMIN) return this.users.listAllOwners()
    if (!editor?.shopId) throw new ForbiddenException('บัญชีนี้ยังไม่ผูกกับร้านใด')
    return this.users.listOwnersForShop(editor.shopId)
  }

  /** เลื่อน/ถอดสิทธิ์ผู้ใช้ — ขอบเขตแยกตาม role ของผู้แก้ไข (ดูรายละเอียดที่ UsersService.setRole) */
  @UseGuards(RolesGuard)
  @Roles('owner', 'super_admin')
  async setRole(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: SetRoleDto) {
    const editor = await this.users.shopContextFor(jwtUser.sub)
    if (!editor) throw new ForbiddenException('ไม่พบบัญชีผู้เรียก')
    return this.users.setRole(id, dto.role, jwtUser.sub, editor)
  }
}
