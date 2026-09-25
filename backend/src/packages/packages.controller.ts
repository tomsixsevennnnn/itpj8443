import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ListQueryDto } from '../common/list-query.dto'
import { UsersService } from '../users/users.service'
import { CourseInput, CreatePackageDto } from './dto/create-package.dto'
import { ReorderPackagesDto } from './dto/reorder-packages.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { UpdatePackageDto } from './dto/update-package.dto'
import { PackagesService } from './packages.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('packages')
export class PackagesController {
  constructor(
    private packages: PackagesService,
    private users: UsersService,
  ) {}

  /** owner ดูแพ็กเกจร้านตัวเอง, ลูกค้าต้องระบุ shopId ของร้านที่กำลังดู (เลือกร้านมาก่อนแล้วจากหน้ารายชื่อร้าน) */
  @Get()
  async findAll(@CurrentUser() jwtUser: Record<string, any>, @Query() query: ListQueryDto, @Query('shopId') shopIdQ?: string) {
    const ctx = await this.users.shopContextFor(jwtUser.sub)
    const isOwner = ctx?.role === Role.OWNER
    const shopId = isOwner ? ctx?.shopId : shopIdQ
    if (!shopId) throw new ForbiddenException('ต้องระบุร้านที่ต้องการดูแพ็กเกจ')
    return this.packages.findAll(shopId, isOwner, query.page, query.limit)
  }

  private async ownShopId(jwtUser: Record<string, any>): Promise<string> {
    const ctx = await this.users.shopContextFor(jwtUser.sub)
    if (!ctx?.shopId) throw new ForbiddenException('บัญชีนี้ยังไม่ผูกกับร้านใด')
    return ctx.shopId
  }

  @Post()
  @Roles('owner')
  async create(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: CreatePackageDto) {
    return this.packages.create(dto, jwtUser.sub, await this.ownShopId(jwtUser))
  }

  // ต้องอยู่ก่อน @Patch(':id') — ไม่งั้น 'reorder' จะโดนจับเป็นค่า :id แทน
  @Patch('reorder')
  @Roles('owner')
  async reorder(@CurrentUser() jwtUser: Record<string, any>, @Body() dto: ReorderPackagesDto) {
    return this.packages.reorder(dto, await this.ownShopId(jwtUser))
  }

  @Patch(':id')
  @Roles('owner')
  async update(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.packages.update(id, dto, jwtUser.sub, await this.ownShopId(jwtUser))
  }

  @Delete(':id')
  @Roles('owner')
  async remove(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string) {
    return this.packages.remove(id, jwtUser.sub, await this.ownShopId(jwtUser))
  }

  /** เพิ่ม/แก้/ลบทีละข้อในแพ็กเกจ — ทางเลือกแทนการส่ง courses ทั้งชุดผ่าน PATCH /packages/:id */
  @Post(':id/courses')
  @Roles('owner')
  async addCourse(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Body() dto: CourseInput) {
    return this.packages.addCourse(id, dto, await this.ownShopId(jwtUser))
  }

  @Patch(':id/courses/:courseId')
  @Roles('owner')
  async updateCourse(
    @CurrentUser() jwtUser: Record<string, any>,
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.packages.updateCourse(id, courseId, dto, await this.ownShopId(jwtUser))
  }

  @Delete(':id/courses/:courseId')
  @Roles('owner')
  async removeCourse(@CurrentUser() jwtUser: Record<string, any>, @Param('id') id: string, @Param('courseId') courseId: string) {
    return this.packages.removeCourse(id, courseId, await this.ownShopId(jwtUser))
  }
}
