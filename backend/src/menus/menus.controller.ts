import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'
import { MenusService } from './menus.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menus')
export class MenusController {
  constructor(private menus: MenusService) {}

  @Get()
  findAll() {
    return this.menus.findAll()
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreateMenuItemDto) {
    return this.menus.create(dto)
  }

  @Patch(':id')
  @Roles('owner')
  update(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menus.update(id, dto)
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string) {
    return this.menus.remove(id)
  }
}
