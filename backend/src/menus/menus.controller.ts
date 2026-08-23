import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
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

  @Get()
  async findAll(@CurrentUser() jwtUser: Record<string, any>, @Query() query: ListQueryDto) {
    return this.menus.findAll(await this.users.isOwner(jwtUser.sub), query.page, query.limit)
  }

  @Post()
  @Roles('owner')
  create(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: CreateMenuItemDto) {
    return this.menus.create(dto, jwtUser.sub)
  }

  @Patch(':id')
  @Roles('owner')
  update(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menus.update(id, dto, jwtUser.sub)
  }

  @Delete(':id')
  @Roles('owner')
  remove(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string) {
    return this.menus.remove(id, jwtUser.sub)
  }
}
