import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreatePackageDto } from './dto/create-package.dto'
import { UpdatePackageDto } from './dto/update-package.dto'
import { PackagesService } from './packages.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('packages')
export class PackagesController {
  constructor(private packages: PackagesService) {}

  @Get()
  findAll() {
    return this.packages.findAll()
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreatePackageDto) {
    return this.packages.create(dto)
  }

  @Patch(':id')
  @Roles('owner')
  update(@Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.packages.update(id, dto)
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string) {
    return this.packages.remove(id)
  }
}
