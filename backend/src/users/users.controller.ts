import { Body, Controller, Delete, ForbiddenException, Get, Logger, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { Throttle } from '@nestjs/throttler'
import { Role } from '@prisma/client'
import { CurrentUser, JwtUser } from '../auth/current-user.decorator'
import { fetchVerifiedIdentity } from '../auth/userinfo'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { AddOwnerDto } from '../shops/dto/add-owner.dto'
import { ShopsService } from '../shops/shops.service'
import { SearchUsersDto } from './dto/search-users.dto'
import { SetRoleDto } from './dto/set-role.dto'
import { SyncProfileDto } from './dto/sync-profile.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersService } from './users.service'

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name)

  constructor(
    private readonly users: UsersService,
    private readonly shops: ShopsService,
  ) {}

  /**
   * frontend เรียกทันทีหลัง login สำเร็จ — ส่ง profile จาก ID token มาเอง (access token ไม่มี
   * name/email/picture ให้) ผู้ใช้ใหม่ทุกคนเริ่มเป็น CUSTOMER เสมอ (สิทธิ์ owner ต้องมาจาก ShopMember ที่ super admin
   * สร้าง/มอบหมายให้เท่านั้น ดู ShopsService.createShop) response แนบ memberships (ร้านที่เป็น owner อยู่) ให้ frontend เลือกร้านที่เปิดอยู่ ยกเว้นอีเมลใน SUPER_ADMIN_EMAILS ที่ syncProfile
   * เช็คเองแล้วตั้งเป็น SUPER_ADMIN ให้ตอนสร้างครั้งแรก
   */
  // จำกัดแรงกว่า global default (60/min ที่ app.module.ts) เพราะ endpoint นี้ยิงทุกครั้งที่ login — ไม่ควรมีใคร
  // เรียกถี่ขนาดนั้นตามปกติ กันยิงรัวๆ โดยไม่จำเป็น
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('me')
  async sync(@CurrentUser() jwtUser: JwtUser, @Body() dto: SyncProfileDto, @Req() req: Request) {
    // อีเมลที่ Auth0 ยืนยันแล้ว (ถามจาก /userinfo ด้วย token ของผู้เรียกเอง) — ใช้ตัดสินสิทธิ์พิเศษ (super admin / คำเชิญเป็นเจ้าของร้าน)
    // และเป็นอีเมลที่บันทึกลง DB เท่านั้น อีเมลใน body ปลอมได้จึงไม่ใช้ตัดสินสิทธิ์
    const identity = await fetchVerifiedIdentity(req.headers.authorization)
    if (!identity) {
      this.logger.warn(
        `ถามอีเมลจาก Auth0 /userinfo ไม่สำเร็จ (auth0Sub=${jwtUser.sub}) — ไม่ให้สิทธิ์ super admin/คำเชิญจากรอบนี้ ตรวจว่า access token มี scope openid และ AUTH0_DOMAIN ถูกต้อง`,
      )
    }
    const user = await this.users.syncProfile(jwtUser.sub, Role.CUSTOMER, dto, identity?.emailVerified ? identity.email : null)
    // คำเชิญเป็นเจ้าของร้านที่ super admin ใส่อีเมลไว้ล่วงหน้า — ได้สิทธิ์ตอน login ครั้งแรก (ถ้ามีสิทธิ์ใหม่ อ่านผู้ใช้ซ้ำให้ memberships ล่าสุด)
    const claimed = await this.users.claimOwnerInvites(jwtUser.sub, identity)
    return claimed ? ((await this.users.findWithMemberships(jwtUser.sub)) ?? user) : user
  }

  /** บันทึกเบอร์โทร/Line ID ที่ Auth0 ไม่มีให้ (ดูหน้า CompleteProfile ฝั่ง frontend) */
  @Patch('me')
  updateProfile(@CurrentUser() jwtUser: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(jwtUser.sub, dto)
  }

  /** ค้นหา user ที่เคย login เข้าระบบมาก่อนอย่างน้อย 1 ครั้ง ด้วยอีเมล — หน้า "สิทธิ์การเข้าถึง" ของ owner
   *  (หา staff มาเชิญเข้าร้านตัวเอง) และหน้าจัดการร้านของ super admin (หา owner คนแรกตอนสร้างร้านใหม่) */
  @UseGuards(RolesGuard)
  @Roles('owner', 'super_admin')
  @Get('search')
  async search(@CurrentUser() jwtUser: JwtUser, @Query() query: SearchUsersDto) {
    const editor = await this.users.shopContextFor(jwtUser.sub, jwtUser.requestedShopId)
    return this.users.searchByEmail(query.email, editor?.role === Role.OWNER ? editor.shopId : null)
  }

  /** owner ทั้งหมด — owner เห็นแค่ร้านตัวเอง, super admin เห็นข้ามทุกร้านพร้อมข้อมูลร้าน */
  @UseGuards(RolesGuard)
  @Roles('owner', 'super_admin')
  @Get('owners')
  async owners(@CurrentUser() jwtUser: JwtUser) {
    const editor = await this.users.shopContextFor(jwtUser.sub, jwtUser.requestedShopId)
    if (editor?.role === Role.SUPER_ADMIN) return this.users.listAllOwners()
    if (!editor?.shopId) throw new ForbiddenException('บัญชีนี้ยังไม่ผูกกับร้านใด')
    return this.users.listOwnersForShop(editor.shopId)
  }

  /** ร้านของ owner ที่เรียก (ตาม X-Shop-Id) — ใช้กับ endpoint คำเชิญด้านล่าง ไม่มีร้าน = ไม่มีสิทธิ์ */
  private async ownShopId(jwtUser: JwtUser): Promise<string> {
    const editor = await this.users.shopContextFor(jwtUser.sub, jwtUser.requestedShopId)
    if (!editor?.shopId) throw new ForbiddenException('บัญชีนี้ยังไม่ผูกกับร้านใด')
    return editor.shopId
  }

  /** คำเชิญเป็นเจ้าของร้านที่ยังไม่มีคนรับ ของร้านตัวเอง (อีเมลที่ยังไม่เคย login) */
  @UseGuards(RolesGuard)
  @Roles('owner')
  @Get('owner-invites')
  async ownerInvites(@CurrentUser() jwtUser: JwtUser) {
    return this.shops.listInvites(await this.ownShopId(jwtUser))
  }

  /** เชิญเจ้าของร้านคนใหม่ด้วยอีเมล — เคย login แล้วเพิ่มเป็น owner ทันที ยังไม่เคย login สร้างเป็นคำเชิญล่วงหน้า (ได้สิทธิ์เองตอน login ครั้งแรก
   *  ด้วยอีเมลที่ Auth0 ยืนยัน) ใช้ตรรกะเดียวกับที่ super admin เพิ่ม owner ให้ร้าน แต่จำกัดที่ร้านของตัวเองเสมอ */
  @UseGuards(RolesGuard)
  @Roles('owner')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('owner-invites')
  async inviteOwner(@CurrentUser() jwtUser: JwtUser, @Body() dto: AddOwnerDto) {
    return this.shops.addOwner(await this.ownShopId(jwtUser), dto.email, jwtUser.sub)
  }

  /** ยกเลิกคำเชิญที่ยังไม่มีคนรับ (เฉพาะของร้านตัวเอง — ร้านอื่นหาไม่เจอ) */
  @UseGuards(RolesGuard)
  @Roles('owner')
  @Delete('owner-invites/:inviteId')
  async removeOwnerInvite(@CurrentUser() jwtUser: JwtUser, @Param('inviteId') inviteId: string) {
    return this.shops.removeInvite(await this.ownShopId(jwtUser), inviteId, jwtUser.sub)
  }

  /** เลื่อน/ถอดสิทธิ์ผู้ใช้ — ขอบเขตแยกตาม role ของผู้แก้ไข (ดูรายละเอียดที่ UsersService.setRole) */
  @UseGuards(RolesGuard)
  @Roles('owner', 'super_admin')
  @Patch(':id/role')
  async setRole(@CurrentUser() jwtUser: JwtUser, @Param('id') id: string, @Body() dto: SetRoleDto) {
    const editor = await this.users.shopContextFor(jwtUser.sub, jwtUser.requestedShopId)
    if (!editor) throw new ForbiddenException('ไม่พบบัญชีผู้เรียก')
    return this.users.setRole(id, dto.role, jwtUser.sub, editor)
  }
}
