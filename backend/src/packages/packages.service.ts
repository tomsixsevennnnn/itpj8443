import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditService } from '../audit/audit.service'
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
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** isOwner = false → strip costPrice ออกจากเมนูที่ซ้อนอยู่ในแต่ละ course (ไม่ส่ง page/limit มา = คืน array เต็มเหมือนเดิม)
   *  ทั้งสองฝั่งกรอง deletedAt: null ทั้งตัวแพ็กเกจเองและเมนูที่ซ้อนอยู่ — แพ็กเกจ/เมนูที่ถูกลบ (soft delete) ยังอยู่ใน
   *  ตารางเพื่อให้ booking เก่าอ้างถึงได้ แต่ต้องไม่โผล่ในรายการที่ใช้เลือก/จัดการตามปกติ */
  async findAll(isOwner: boolean, page?: number, limit?: number) {
    const args = pageArgsFor(page, limit)
    const where = { deletedAt: null }
    const orderBy = { sortOrder: 'asc' as const }
    const coursesOrderBy = { no: 'asc' as const }

    if (isOwner) {
      const include = {
        courses: { include: { items: { where: { deletedAt: null } } }, orderBy: coursesOrderBy },
      }
      if (!args) return this.prisma.package.findMany({ where, orderBy, include })
      const [data, total] = await Promise.all([
        this.prisma.package.findMany({ where, orderBy, include, skip: args.skip, take: args.take }),
        this.prisma.package.count({ where }),
      ])
      return { data, total, page: args.page, limit: args.limit }
    }

    const include = {
      courses: {
        include: { items: { where: { deletedAt: null }, select: CUSTOMER_MENU_ITEM_SELECT } },
        orderBy: coursesOrderBy,
      },
    }
    if (!args) return this.prisma.package.findMany({ where, orderBy, include })
    const [data, total] = await Promise.all([
      this.prisma.package.findMany({ where, orderBy, include, skip: args.skip, take: args.take }),
      this.prisma.package.count({ where }),
    ])
    return { data, total, page: args.page, limit: args.limit }
  }

  async create(dto: CreatePackageDto, editorAuth0Sub: string) {
    const count = await this.prisma.package.count({ where: { deletedAt: null } })
    const after = await this.prisma.package.create({
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
    await this.audit.log(editorAuth0Sub, 'package.create', 'Package', after.id, undefined, after)
    return after
  }

  /** เจ้าของร้านลากจัดเรียงแพ็กเกจในหน้า "จัดการแพ็กเกจ" — ids ต้องครบและตรงกับแพ็กเกจที่ยังไม่ถูกลบทั้งหมดพอดี */
  async reorder(dto: ReorderPackagesDto) {
    const existing = await this.prisma.package.findMany({ where: { deletedAt: null }, select: { id: true } })
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
    const before = await this.prisma.package.findUnique({ where: { id } })

    if (!dto.courses) {
      const after = await this.prisma.package.update({
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
      await this.audit.log(editorAuth0Sub, 'package.update', 'Package', id, before, after)
      return after
    }

    // ส่ง courses มา = แทนที่ทุกข้อทั้งชุด (ลบของเดิมแล้วสร้างใหม่ในทรานแซกชันเดียว)
    const after = await this.prisma.$transaction(async (tx) => {
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
    await this.audit.log(editorAuth0Sub, 'package.update', 'Package', id, before, after)
    return after
  }

  /** soft delete — booking เก่าที่อ้าง packageId นี้ยังอ่านราคาพื้นฐานย้อนหลังได้ (แค่ซ่อนจากรายการแพ็กเกจปกติ) */
  async remove(id: string, editorAuth0Sub: string) {
    const before = await this.prisma.package.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('ไม่พบแพ็กเกจนี้')

    const after = await this.prisma.package.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit.log(editorAuth0Sub, 'package.delete', 'Package', id, before, after)
    return after
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
