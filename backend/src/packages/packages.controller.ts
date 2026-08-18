import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AUTH0_ROLE_CLAIM } from '../auth/auth.constants'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ListQueryDto } from '../common/list-query.dto'
import { CourseInput, CreatePackageDto } from './dto/create-package.dto'
import { ReorderPackagesDto } from './dto/reorder-packages.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { UpdatePackageDto } from './dto/update-package.dto'
import { PackagesService } from './packages.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('packages')
export class PackagesController {
  constructor(private packages: PackagesService) {}

  @Get()
  findAll(@CurrentUser() jwtUser: Record<string, any>, @Query() query: ListQueryDto) {
    return this.packages.findAll(jwtUser[AUTH0_ROLE_CLAIM] === 'owner', query.page, query.limit)
  }

  @Post()
  @Roles('owner')
  create(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: CreatePackageDto) {
    return this.packages.create(dto, jwtUser.sub)
  }

  // ต้องอยู่ก่อน @Patch(':id') — ไม่งั้น 'reorder' จะโดนจับเป็นค่า :id แทน
  @Patch('reorder')
  @Roles('owner')
  reorder(@Body() dto: ReorderPackagesDto) {
    return this.packages.reorder(dto)
  }

  @Patch(':id')
  @Roles('owner')
  update(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.packages.update(id, dto, jwtUser.sub)
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string) {
    return this.packages.remove(id)
  }

  /** เพิ่ม/แก้/ลบทีละข้อในแพ็กเกจ — ทางเลือกแทนการส่ง courses ทั้งชุดผ่าน PATCH /packages/:id */
  @Post(':id/courses')
  @Roles('owner')
  addCourse(@Param('id') id: string, @Body() dto: CourseInput) {
    return this.packages.addCourse(id, dto)
  }

  @Patch(':id/courses/:courseId')
  @Roles('owner')
  updateCourse(@Param('id') id: string, @Param('courseId') courseId: string, @Body() dto: UpdateCourseDto) {
    return this.packages.updateCourse(id, courseId, dto)
  }

  @Delete(':id/courses/:courseId')
  @Roles('owner')
  removeCourse(@Param('id') id: string, @Param('courseId') courseId: string) {
    return this.packages.removeCourse(id, courseId)
  }
}
