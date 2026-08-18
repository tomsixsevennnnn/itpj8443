import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { pageArgsFor } from '../common/pagination'
import { PrismaService } from '../prisma/prisma.service'
import { CourseInput, CreatePackageDto } from './dto/create-package.dto'
import { ReorderPackagesDto } from './dto/reorder-packages.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { UpdatePackageDto } from './dto/update-package.dto'

/** ลูกค้าไม่ควรเห็นต้นทุนต่อจานของเมนูที่ซ้อนอยู่ในแพ็กเกจ — เหมือนกับ MenusService */
const CUSTOMER_MENU_ITEM_SELECT = {
  id: true,
  name: true,
  category: true,
  description: true,
  image: true,
  extraPrice: true,
  active: true,
} as const

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  /** isOwner = false → strip costPrice ออกจากเมนูที่ซ้อนอยู่ในแต่ละ course (ไม่ส่ง page/limit มา = คืน array เต็มเหมือนเดิม) */
  async findAll(isOwner: boolean, page?: number, limit?: number) {
    const args = pageArgsFor(page, limit)
    const orderBy = { sortOrder: 'asc' as const }
    const coursesOrderBy = { no: 'asc' as const }

    if (isOwner) {
      const include = { courses: { include: { items: true }, orderBy: coursesOrderBy } }
      if (!args) return this.prisma.package.findMany({ orderBy, include })
      const [data, total] = await Promise.all([
        this.prisma.package.findMany({ orderBy, include, skip: args.skip, take: args.take }),
        this.prisma.package.count(),
      ])
      return { data, total, page: args.page, limit: args.limit }
    }

    const include = {
      courses: { include: { items: { select: CUSTOMER_MENU_ITEM_SELECT } }, orderBy: coursesOrderBy },
    }
    if (!args) return this.prisma.package.findMany({ orderBy, include })
    const [data, total] = await Promise.all([
      this.prisma.package.findMany({ orderBy, include, skip: args.skip, take: args.take }),
      this.prisma.package.count(),
    ])
    return { data, total, page: args.page, limit: args.limit }
  }

  async create(dto: CreatePackageDto, editorAuth0Sub: string) {
    const count = await this.prisma.package.count()
    return this.prisma.package.create({
      data: {
        name: dto.name,
        pricePerTable: dto.pricePerTable,
        menuLimit: dto.menuLimit,
        description: dto.description ?? '',
        features: dto.features ?? [],
        badge: dto.badge,
        // แพ็กเกจใหม่ต่อท้ายลำดับที่มีอยู่เสมอ
        sortOrder: count,
        lastEditedBy: editorAuth0Sub,
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

  /** เจ้าของร้านลากจัดเรียงแพ็กเกจในหน้า "จัดการแพ็กเกจ" — ids ต้องครบและตรงกับแพ็กเกจที่มีอยู่ทั้งหมดพอดี */
  async reorder(dto: ReorderPackagesDto) {
    const existing = await this.prisma.package.findMany({ select: { id: true } })
    const existingIds = new Set(existing.map((p) => p.id))
    const uniqueIds = new Set(dto.ids)
    const isValid =
      uniqueIds.size === dto.ids.length &&
      uniqueIds.size === existingIds.size &&
      dto.ids.every((id) => existingIds.has(id))
    if (!isValid) {
      throw new BadRequestException('รายการ id ต้องตรงกับแพ็กเกจทั้งหมดที่มีอยู่พอดี ไม่ซ้ำ ไม่ขาด')
    }
    await this.prisma.$transaction(
      dto.ids.map((id, index) => this.prisma.package.update({ where: { id }, data: { sortOrder: index } })),
    )
    return this.findAll(true)
  }

  async update(id: string, dto: UpdatePackageDto, editorAuth0Sub: string) {
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
          lastEditedBy: editorAuth0Sub,
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
          lastEditedBy: editorAuth0Sub,
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
