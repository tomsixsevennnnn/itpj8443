import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CourseInput, CreatePackageDto } from './dto/create-package.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { UpdatePackageDto } from './dto/update-package.dto'

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.package.findMany({
      include: { courses: { include: { items: true }, orderBy: { no: 'asc' } } },
    })
  }

  create(dto: CreatePackageDto) {
    return this.prisma.package.create({
      data: {
        name: dto.name,
        pricePerTable: dto.pricePerTable,
        menuLimit: dto.menuLimit,
        description: dto.description ?? '',
        features: dto.features ?? [],
        badge: dto.badge,
        courses: {
          create: dto.courses.map((c) => ({
            no: c.no,
            title: c.title,
            icon: c.icon,
            category: c.category,
            choose: c.choose,
            items: { connect: c.itemIds.map((id) => ({ id })) },
          })),
        },
      },
      include: { courses: { include: { items: true } } },
    })
  }

  async update(id: string, dto: UpdatePackageDto) {
    if (!dto.courses) {
      return this.prisma.package.update({
        where: { id },
        data: {
          name: dto.name,
          pricePerTable: dto.pricePerTable,
          menuLimit: dto.menuLimit,
          description: dto.description,
          features: dto.features,
          badge: dto.badge,
        },
      })
    }

    // ส่ง courses มา = แทนที่ทุกข้อทั้งชุด (ลบของเดิมแล้วสร้างใหม่ในทรานแซกชันเดียว)
    return this.prisma.$transaction(async (tx) => {
      await tx.packageCourse.deleteMany({ where: { packageId: id } })
      return tx.package.update({
        where: { id },
        data: {
          name: dto.name,
          pricePerTable: dto.pricePerTable,
          menuLimit: dto.menuLimit ?? dto.courses!.length,
          description: dto.description,
          features: dto.features,
          badge: dto.badge,
          courses: {
            create: dto.courses!.map((c) => ({
              no: c.no,
              title: c.title,
              icon: c.icon,
              category: c.category,
              choose: c.choose,
              items: { connect: c.itemIds.map((itemId) => ({ id: itemId })) },
            })),
          },
        },
        include: { courses: { include: { items: true } } },
      })
    })
  }

  remove(id: string) {
    return this.prisma.package.delete({ where: { id } })
  }

  /** เพิ่มข้อใหม่เข้าแพ็กเกจที่มีอยู่ โดยไม่ต้องส่งคอร์สทั้งชุด */
  addCourse(packageId: string, dto: CourseInput) {
    return this.prisma.packageCourse.create({
      data: {
        packageId,
        no: dto.no,
        title: dto.title,
        icon: dto.icon,
        category: dto.category,
        choose: dto.choose,
        items: { connect: dto.itemIds.map((itemId) => ({ id: itemId })) },
      },
      include: { items: true },
    })
  }

  /** แก้ทีละข้อ — ส่ง itemIds มา = แทนที่รายการเมนูในข้อนี้ทั้งหมด ไม่ส่ง = ไม่แตะรายการเมนูเดิม */
  async updateCourse(packageId: string, courseId: string, dto: UpdateCourseDto) {
    await this.assertCourseInPackage(packageId, courseId)
    return this.prisma.packageCourse.update({
      where: { id: courseId },
      data: {
        no: dto.no,
        title: dto.title,
        icon: dto.icon,
        category: dto.category,
        choose: dto.choose,
        ...(dto.itemIds ? { items: { set: dto.itemIds.map((itemId) => ({ id: itemId })) } } : {}),
      },
      include: { items: true },
    })
  }

  async removeCourse(packageId: string, courseId: string) {
    await this.assertCourseInPackage(packageId, courseId)
    return this.prisma.packageCourse.delete({ where: { id: courseId } })
  }

  private async assertCourseInPackage(packageId: string, courseId: string) {
    const course = await this.prisma.packageCourse.findFirst({ where: { id: courseId, packageId } })
    if (!course) throw new NotFoundException('ไม่พบข้อนี้ในแพ็กเกจ')
    return course
  }
}
