import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CourseInput, CreatePackageDto } from './dto/create-package.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
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
