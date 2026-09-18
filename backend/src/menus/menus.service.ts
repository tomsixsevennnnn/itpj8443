import { Injectable, NotFoundException } from '@nestjs/common'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { pageArgsFor } from '../common/pagination'
import { UploadsService } from '../uploads/uploads.service'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'

/** ลูกค้าไม่ควรเห็นต้นทุนต่อจาน (ข้อมูลต้นทุน/กำไรภายในร้าน) */
const CUSTOMER_SELECT = {
  id: true,
  name: true,
  category: true,
  description: true,
  image: true,
  active: true,
} as const

@Injectable()
export class MenusService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private uploads: UploadsService,
  ) {}

  /** isOwner = false → strip costPrice ออกจาก response ทั้งหมด (ไม่ส่ง page/limit มา = คืน array เต็มเหมือนเดิม)
   *  ทั้งสองฝั่งกรอง deletedAt: null เสมอ — เมนูที่ถูกลบ (soft delete) ยังอยู่ในตารางเพื่อให้ course ของแพ็กเกจเก่า
   *  และประวัติ booking เก่าอ้างถึงได้ แต่ต้องไม่โผล่ในรายการเมนูที่ใช้เลือก/จัดการตามปกติ */
  async findAll(isOwner: boolean, page?: number, limit?: number) {
    const args = pageArgsFor(page, limit)
    const orderBy = { name: 'asc' as const }
    const where = { deletedAt: null }

    if (isOwner) {
      if (!args) return this.prisma.menuItem.findMany({ where, orderBy })
      const [data, total] = await Promise.all([
        this.prisma.menuItem.findMany({ where, orderBy, skip: args.skip, take: args.take }),
        this.prisma.menuItem.count({ where }),
      ])
      return { data, total, page: args.page, limit: args.limit }
    }

    if (!args) return this.prisma.menuItem.findMany({ where, orderBy, select: CUSTOMER_SELECT })
    const [data, total] = await Promise.all([
      this.prisma.menuItem.findMany({ where, orderBy, select: CUSTOMER_SELECT, skip: args.skip, take: args.take }),
      this.prisma.menuItem.count({ where }),
    ])
    return { data, total, page: args.page, limit: args.limit }
  }

  async create(dto: CreateMenuItemDto, editorAuth0Sub: string) {
    // imagePosition เป็น class instance จาก class-transformer (ValidationPipe transform: true) — ต้อง spread เป็น
    // plain object ก่อนส่งเข้า Prisma เพราะคอลัมน์ Json ต้องการ index signature ตรงๆ ไม่รับ instance ของ class
    const after = await this.prisma.menuItem.create({
      data: { ...dto, imagePosition: dto.imagePosition ? { ...dto.imagePosition } : undefined, lastEditedBy: editorAuth0Sub },
    })
    await this.audit.log(editorAuth0Sub, 'menu.create', 'MenuItem', after.id, undefined, after)
    return after
  }

  async update(id: string, dto: UpdateMenuItemDto, editorAuth0Sub: string) {
    const before = await this.prisma.menuItem.findUnique({ where: { id } })
    const after = await this.prisma.menuItem.update({
      where: { id },
      data: { ...dto, imagePosition: dto.imagePosition ? { ...dto.imagePosition } : undefined, lastEditedBy: editorAuth0Sub },
    })

    // เปลี่ยนรูปเมนู — ไฟล์เก่ากำลังจะถูกลบทิ้งกัน orphan สะสมบน disk แต่ประวัติการแก้ไข (audit log) ต้องยังดู
    // รูปเดิมย้อนหลังได้ เลยย่อเป็น thumbnail คุณภาพต่ำฝังไว้แทน path เดิมก่อนลบไฟล์จริงทิ้ง
    const imageReplaced = dto.image !== undefined && before?.image && before.image !== after.image
    const auditBefore =
      before && imageReplaced ? { ...before, image: (await this.uploads.makeThumbnailDataUrl(before.image)) ?? before.image } : before
    await this.audit.log(editorAuth0Sub, 'menu.update', 'MenuItem', id, auditBefore, after)
    if (imageReplaced) {
      await this.uploads.deleteManagedFile(before!.image)
    }
    return after
  }

  /** soft delete — ยังอยู่ใน course เดิมที่อ้างถึง (ประวัติ booking/แพ็กเกจเก่าไม่พัง) แค่ซ่อนจากรายการเมนูปกติ
   *  ไม่ลบไฟล์รูปทิ้งเหมือนตอน hard delete เพราะแถวยังอยู่จริงและอาจถูกแสดงในหน้าแพ็กเกจเก่าที่ยังอ้างถึงอยู่ */
  async remove(id: string, editorAuth0Sub: string) {
    const before = await this.prisma.menuItem.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('ไม่พบเมนูนี้')

    const after = await this.prisma.menuItem.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit.log(editorAuth0Sub, 'menu.delete', 'MenuItem', id, before, after)
    return after
  }
}
