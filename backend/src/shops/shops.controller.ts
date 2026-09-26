import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { AddOwnerDto } from './dto/add-owner.dto'
import { CreateShopDto } from './dto/create-shop.dto'
import { DeleteShopDto } from './dto/delete-shop.dto'
import { SetShopStatusDto } from './dto/set-shop-status.dto'
import { UpdateShopDto } from './dto/update-shop.dto'
import { ShopsService } from './shops.service'

@Controller('shops')
export class ShopsController {
  constructor(private shops: ShopsService) {}

  /** ไม่ต้อง login — หน้ารายชื่อร้านให้ลูกค้าเลือกก่อนเริ่มจอง */
  @Get('public')
  listPublic() {
    return this.shops.listActivePublic()
  }

  /** ไม่ต้อง login — เปิดจาก URL เฉพาะร้าน (/shop/:slug) ก่อนเข้าสู่ flow การจองของร้านนั้น */
  @Get(':slug/public')
  getPublicBySlug(@Param('slug') slug: string) {
    return this.shops.findBySlugPublic(slug)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get()
  listAll() {
    return this.shops.listAll()
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post()
  create(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: CreateShopDto) {
    return this.shops.createShop(dto, jwtUser.sub)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Patch(':id')
  update(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: UpdateShopDto) {
    return this.shops.updateShop(id, dto, jwtUser.sub)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Patch(':id/status')
  setStatus(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: SetShopStatusDto) {
    return this.shops.setStatus(id, dto.status, jwtUser.sub)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post(':id/owners')
  addOwner(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: AddOwnerDto) {
    return this.shops.addOwner(id, dto.email, jwtUser.sub)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Delete(':id/owners/:userId')
  removeOwner(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Param('userId') userId: string) {
    return this.shops.removeOwner(id, userId, jwtUser.sub)
  }

  /** ลบร้านถาวร — ต้องพิมพ์ชื่อร้านมายืนยันตรงตัวเป๊ะใน body เท่านั้นถึงจะลบได้ (ดู ShopsService.deleteShop) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Delete(':id')
  delete(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: DeleteShopDto) {
    return this.shops.deleteShop(id, dto.confirmName, jwtUser.sub)
  }
}
