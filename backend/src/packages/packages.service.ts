import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { MenuItem, PackageCourse, Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { AuditService } from '../audit/audit.service'
import { pageArgsFor } from '../common/pagination'
import { PrismaService } from '../prisma/prisma.service'
import { CourseInput, CreatePackageDto } from './dto/create-package.dto'
import { ReorderPackagesDto } from './dto/reorder-packages.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { UpdatePackageDto } from './dto/update-package.dto'

/** ตาราง join ที่ Prisma สร้างเองให้ความสัมพันธ์ many-to-many "CourseItems" (MenuItem <-> PackageCourse)
 *  ชื่อคอลัมน์ A/B เรียงตามชื่อโมเดลตามตัวอักษร: A = MenuItem.id, B = PackageCourse.id (ดู migration เริ่มต้น) */
const insertCourseItemPairs = (
  tx: Prisma.TransactionClient,
  courses: { id: string; itemIds: string[] }[],
) => {
  const pairs = courses.flatMap((c) => [...new Set(c.itemIds)].map((itemId) => ({ itemId, courseId: c.id })))
  if (pairs.length === 0) return Promise.resolve()
  return tx.$executeRaw`
    INSERT INTO "_CourseItems" ("A", "B")
    VALUES ${Prisma.join(pairs.map((p) => Prisma.sql`(${p.itemId}, ${p.courseId})`))}
  `
}

/**
 * เทียบว่า courses ที่ส่งมาเหมือนของเดิมทุกอย่างไหม (ข้อ, ชื่อ, ไอคอน, ประเภท, จำนวนที่เลือก, รายการเมนู)
 * ใช้ตัดสินว่าต้องทำ delete-then-recreate ทั้งชุดจริงไหม — เพราะฟอร์มแก้ไขฝั่ง frontend (owner/Packages.tsx)
 * ส่ง courses มาด้วยทุกครั้งที่บันทึกอยู่แล้ว ไม่ว่าจะแก้แค่ชื่อ/ราคาแพ็กเกจหรือแก้ courses จริงๆ ก็ตาม
 * ถ้าไม่เช็คก่อน ทุกครั้งที่ owner แก้แค่ราคาก็จะโดนลบ+สร้าง course/เมนูใหม่ทั้งชุดโดยไม่จำเป็น
 */
function coursesUnchanged(existing: (PackageCourse & { items: MenuItem[] })[], incoming: CourseInput[]): boolean {
  if (existing.length !== incoming.length) return false

  const byNo = [...existing].sort((a, b) => a.no - b.no)
  const incomingByNo = [...incoming].sort((a, b) => a.no - b.no)

  return byNo.every((course, i) => {
    const next = incomingByNo[i]
    if (
      course.no !== next.no ||
      course.title !== next.title ||
      (course.icon ?? '') !== (next.icon ?? '') ||
      course.category !== next.category ||
      course.choose !== next.choose
    ) {
      return false
    }
    const existingIds = new Set(course.items.map((item) => item.id))
    const incomingIds = new Set(next.itemIds)
    if (existingIds.size !== incomingIds.size) return false
    for (const id of existingIds) if (!incomingIds.has(id)) return false
    return true
  })
}

/** ประกอบ courses+items กลับเป็น shape เดียวกับที่ query ปกติ include ให้ — ใช้ตอนดึง MenuItem แบบขนานไปกับ
 *  transaction ที่เขียน (คนละ connection) แทนที่จะรอเขียนเสร็จก่อนค่อยยิง query อ่านกลับซ้ำอีกรอบ */
const assembleCourses = (
  courses: { id: string; packageId: string; no: number; title: string; icon?: string; category: string; choose: number; itemIds: string[] }[],
  itemsById: Map<string, MenuItem>,
) =>
  courses.map((c) => ({
    id: c.id,
    packageId: c.packageId,
    no: c.no,
    title: c.title,
    icon: c.icon ?? null,
    category: c.category,
    choose: c.choose,
    items: [...new Set(c.itemIds)]
      .map((itemId) => itemsById.get(itemId))
      .filter((item): item is MenuItem => Boolean(item)),
  }))

/** ลูกค้าไม่ควรเห็นต้นทุนต่อจานของเมนูที่ซ้อนอยู่ในแพ็กเกจ — เหมือนกับ MenusService */
const CUSTOMER_MENU_ITEM_SELECT = {
  id: true,
  name: true,
  category: true,
  description: true,
  image: true,
  active: true,
} as const

@Injectable()
export class PackagesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async fetchItemsById(itemIds: string[]): Promise<Map<string, MenuItem>> {
    if (itemIds.length === 0) return new Map()
    const items = await this.prisma.menuItem.findMany({ where: { id: { in: itemIds } } })
    return new Map(items.map((i) => [i.id, i]))
  }

  /** isOwner = false → strip costPrice ออกจากเมนูที่ซ้อนอยู่ในแต่ละ course (ไม่ส่ง page/limit มา = คืน array เต็มเหมือนเดิม)
   *  ทั้งสองฝั่งกรอง deletedAt: null ทั้งตัวแพ็กเกจเองและเมนูที่ซ้อนอยู่ — แพ็กเกจ/เมนูที่ถูกลบ (soft delete) ยังอยู่ใน
   *  ตารางเพื่อให้ booking เก่าอ้างถึงได้ แต่ต้องไม่โผล่ในรายการที่ใช้เลือก/จัดการตามปกติ */
  async findAll(shopId: string, isOwner: boolean, page?: number, limit?: number) {
    const args = pageArgsFor(page, limit)
    const where = { shopId, deletedAt: null }
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

  async create(dto: CreatePackageDto, editorAuth0Sub: string, shopId: string) {
    const count = await this.prisma.package.count({ where: { shopId, deletedAt: null } })
    const packageId = randomUUID()
    const courseIds = dto.courses.map(() => randomUUID())
    const itemIds = [...new Set(dto.courses.flatMap((c) => c.itemIds))]

    // nested create หลายข้อ × connect หลายเมนู/ข้อ กลายเป็นหลาย round trip ต่อเนื่องกัน (query ต่อ course บวก
    // query ต่อ connect) — ยิ่งช้าเมื่อ DB อยู่ไกล (dev เครื่องนี้ชี้ไป Railway ผ่าน public proxy) เลยยิง createMany
    // + insert join table แบบ batch แทน ลดจากหลักสิบ query เหลือแค่ไม่กี่ query
    // ดึง MenuItem ที่ต้องใช้ประกอบผลลัพธ์แบบขนานไปกับ transaction ที่เขียน (คนละ connection) แทนที่จะรอเขียน
    // เสร็จก่อนค่อยยิง query อ่านกลับซ้ำ — ตัด round trip สุดท้ายออกไปได้อีก 1 ก้อน
    const [itemsById, created] = await Promise.all([
      this.fetchItemsById(itemIds),
      this.prisma.$transaction(
        async (tx) => {
          const pkg = await tx.package.create({
            data: {
              id: packageId,
              shopId,
              name: dto.name,
              pricePerTable: dto.pricePerTable,
              menuLimit: dto.menuLimit,
              description: dto.description ?? '',
              features: dto.features ?? [],
              badge: dto.badge,
              // แพ็กเกจใหม่ต่อท้ายลำดับที่มีอยู่เสมอ
              sortOrder: count,
              lastEditedBy: editorAuth0Sub,
            },
          })
          if (dto.courses.length > 0) {
            await tx.packageCourse.createMany({
              data: dto.courses.map((c, i) => ({
                id: courseIds[i],
                packageId,
                no: c.no,
                title: c.title,
                icon: c.icon,
                category: c.category,
                choose: c.choose,
              })),
            })
            await insertCourseItemPairs(
              tx,
              dto.courses.map((c, i) => ({ id: courseIds[i], itemIds: c.itemIds })),
            )
          }
          return pkg
        },
        { timeout: 20_000 },
      ),
    ])

    const after = {
      ...created,
      courses: assembleCourses(
        dto.courses.map((c, i) => ({
          id: courseIds[i],
          packageId,
          no: c.no,
          title: c.title,
          icon: c.icon,
          category: c.category,
          choose: c.choose,
          itemIds: c.itemIds,
        })),
        itemsById,
      ),
    }
    await this.audit.log(editorAuth0Sub, 'package.create', 'Package', after.id, undefined, after, shopId)
    return after
  }

  /** เจ้าของร้านลากจัดเรียงแพ็กเกจในหน้า "จัดการแพ็กเกจ" — ids ต้องครบและตรงกับแพ็กเกจของร้านตัวเองที่ยังไม่ถูกลบทั้งหมดพอดี */
  async reorder(dto: ReorderPackagesDto, shopId: string) {
    const existing = await this.prisma.package.findMany({ where: { shopId, deletedAt: null }, select: { id: true } })
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
    return this.findAll(shopId, true)
  }

  /** เช็คว่าแพ็กเกจนี้เป็นของร้านที่ editor สังกัดอยู่จริงก่อนทุกครั้ง กัน owner ร้าน A แก้/ลบแพ็กเกจร้าน B ผ่าน id ตรงๆ */
  private async assertPackageOwnedByShop(id: string, shopId: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id } })
    if (!pkg || pkg.shopId !== shopId) throw new NotFoundException('ไม่พบแพ็กเกจนี้')
    return pkg
  }

  async update(id: string, dto: UpdatePackageDto, editorAuth0Sub: string, shopId: string) {
    await this.assertPackageOwnedByShop(id, shopId)
    if (!dto.courses) {
      const before = await this.prisma.package.findUnique({ where: { id } })
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
      await this.audit.log(editorAuth0Sub, 'package.update', 'Package', id, before, after, shopId)
      return after
    }

    // ฟอร์มแก้ไขฝั่ง frontend ส่ง courses มาด้วยทุกครั้งที่บันทึก ไม่ว่าจะแก้แค่ชื่อ/ราคาหรือแก้ courses จริงๆ
    // เช็คก่อนว่า courses เปลี่ยนจริงไหม — ถ้าไม่เปลี่ยนก็อัปเดตแค่ field ระดับบนแบบเดียวกับตอนไม่ส่ง courses มา
    // (round trip เดียว เร็วเท่าแก้ field ธรรมดา) ไม่ต้องเสีย delete+recreate ทั้งชุดโดยไม่จำเป็น
    const before = await this.prisma.package.findUnique({
      where: { id },
      include: { courses: { include: { items: true }, orderBy: { no: 'asc' } } },
    })
    if (before && coursesUnchanged(before.courses, dto.courses)) {
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
        include: { courses: { include: { items: true }, orderBy: { no: 'asc' } } },
      })
      await this.audit.log(editorAuth0Sub, 'package.update', 'Package', id, before, after, shopId)
      return after
    }

    // courses เปลี่ยนจริง — แทนที่ทุกข้อทั้งชุด (ลบของเดิมแล้วสร้างใหม่ในทรานแซกชันเดียว)
    // nested create หลายข้อ × connect หลายเมนู/ข้อ กลายเป็นหลาย round trip ต่อเนื่องกัน (query ต่อ course บวก
    // query ต่อ connect) — ยิ่งช้าเมื่อ DB อยู่ไกล (dev เครื่องนี้ชี้ไป Railway ผ่าน public proxy) เลยยิง createMany
    // + insert join table แบบ batch แทน ลดจากหลักสิบ query เหลือแค่ไม่กี่ query
    // ดึง MenuItem ที่ต้องใช้ประกอบผลลัพธ์แบบขนานไปกับ transaction ที่เขียน (คนละ connection) แทนที่จะรอเขียน
    // เสร็จก่อนค่อยยิง query อ่านกลับซ้ำ — ตัด round trip สุดท้ายออกไปได้อีก 1 ก้อน
    const courseIds = dto.courses!.map(() => randomUUID())
    const itemIds = [...new Set(dto.courses!.flatMap((c) => c.itemIds))]
    const [itemsById, updated] = await Promise.all([
      this.fetchItemsById(itemIds),
      this.prisma.$transaction(
        async (tx) => {
          await tx.packageCourse.deleteMany({ where: { packageId: id } })
          const pkg = await tx.package.update({
            where: { id },
            data: {
              name: dto.name,
              pricePerTable: dto.pricePerTable,
              menuLimit: dto.menuLimit ?? dto.courses!.length,
              description: dto.description,
              features: dto.features,
              badge: dto.badge,
              lastEditedBy: editorAuth0Sub,
            },
          })
          if (dto.courses!.length > 0) {
            await tx.packageCourse.createMany({
              data: dto.courses!.map((c, i) => ({
                id: courseIds[i],
                packageId: id,
                no: c.no,
                title: c.title,
                icon: c.icon,
                category: c.category,
                choose: c.choose,
              })),
            })
            await insertCourseItemPairs(
              tx,
              dto.courses!.map((c, i) => ({ id: courseIds[i], itemIds: c.itemIds })),
            )
          }
          return pkg
        },
        { timeout: 20_000 },
      ),
    ])

    const after = {
      ...updated,
      courses: assembleCourses(
        dto.courses!.map((c, i) => ({
          id: courseIds[i],
          packageId: id,
          no: c.no,
          title: c.title,
          icon: c.icon,
          category: c.category,
          choose: c.choose,
          itemIds: c.itemIds,
        })),
        itemsById,
      ),
    }
    await this.audit.log(editorAuth0Sub, 'package.update', 'Package', id, before, after, shopId)
    return after
  }

  /** soft delete — booking เก่าที่อ้าง packageId นี้ยังอ่านราคาพื้นฐานย้อนหลังได้ (แค่ซ่อนจากรายการแพ็กเกจปกติ) */
  async remove(id: string, editorAuth0Sub: string, shopId: string) {
    const before = await this.assertPackageOwnedByShop(id, shopId)

    const after = await this.prisma.package.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit.log(editorAuth0Sub, 'package.delete', 'Package', id, before, after, shopId)
    return after
  }

  /** เพิ่มข้อใหม่เข้าแพ็กเกจที่มีอยู่ โดยไม่ต้องส่งคอร์สทั้งชุด — เช็คก่อนว่าแพ็กเกจเป็นของร้านตัวเองจริง */
  async addCourse(packageId: string, dto: CourseInput, shopId: string) {
    await this.assertPackageOwnedByShop(packageId, shopId)
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
  async updateCourse(packageId: string, courseId: string, dto: UpdateCourseDto, shopId: string) {
    await this.assertPackageOwnedByShop(packageId, shopId)
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

  async removeCourse(packageId: string, courseId: string, shopId: string) {
    await this.assertPackageOwnedByShop(packageId, shopId)
    await this.assertCourseInPackage(packageId, courseId)
    return this.prisma.packageCourse.delete({ where: { id: courseId } })
  }

  private async assertCourseInPackage(packageId: string, courseId: string) {
    const course = await this.prisma.packageCourse.findFirst({ where: { id: courseId, packageId } })
    if (!course) throw new NotFoundException('ไม่พบข้อนี้ในแพ็กเกจ')
    return course
  }
}
