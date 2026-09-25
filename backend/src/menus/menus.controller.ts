import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ListQueryDto } from '../common/list-query.dto'
import { UsersService } from '../users/users.service'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'
import { MenusService } from './menus.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menus')
export class MenusController {
  constructor(
    private menus: MenusService,
    private users: UsersService,
  ) {}

  /** owner ดูเมนูร้านตัวเอง, ลูกค้าต้องระบุ shopId ของร้านที่กำลังดู (เลือกร้านมาก่อนแล้วจากหน้ารายชื่อร้าน) */
  @Get()
  async findAll(@CurrentUser() jwtUser: Record<string, any>, @Query() query: ListQueryDto, @Query('shopId') shopIdQ?: string) {
    const ctx = await this.users.shopContextFor(jwtUser.sub)
    const isOwner = ctx?.role === Role.OWNER
    const shopId = isOwner ? ctx?.shopId : shopIdQ
    if (!shopId) throw new ForbiddenException('ต้องระบุร้านที่ต้องการดูเมนู')
    return this.menus.findAll(shopId, isOwner, query.page, query.limit)
  }

  private async ownShopId(jwtUser: Record<string, any>): Promise<string> {
    const ctx = await this.users.shopContextFor(jwtUser.sub)
    if (!ctx?.shopId) throw new ForbiddenException('บัญชีนี้ยังไม่ผูกกับร้านใด')
    return ctx.shopId
  }

  @Post()
  @Roles('owner')
  async create(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: CreateMenuItemDto) {
    return this.menus.create(dto, jwtUser.sub, await this.ownShopId(jwtUser))
  }

  @Patch(':id')
  @Roles('owner')
  async update(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menus.update(id, dto, jwtUser.sub, await this.ownShopId(jwtUser))
  }

  @Delete(':id')
  @Roles('owner')
  async remove(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string) {
    return this.menus.remove(id, jwtUser.sub, await this.ownShopId(jwtUser))
  }
}
