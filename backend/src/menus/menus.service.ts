import { Injectable } from '@nestjs/common'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { pageArgsFor } from '../common/pagination'
import { UploadsService } from '../uploads/uploads.service'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'

/** ลูกค้าไม่ควรเห็นต้นทุนต่อจาน (ข้อมูลต้นทุน/กำไรภายในร้าน) — คนละเรื่องกับ extraPrice ที่เป็นราคาขายเพิ่มให้ลูกค้าเห็นได้ปกติ */
const CUSTOMER_SELECT = {
  id: true,
  name: true,
  category: true,
  description: true,
  image: true,
  extraPrice: true,
  active: true,
} as const

@Injectable()
export class MenusService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private uploads: UploadsService,
  ) {}

  /** isOwner = false → strip costPrice ออกจาก response ทั้งหมด (ไม่ส่ง page/limit มา = คืน array เต็มเหมือนเดิม) */
  async findAll(isOwner: boolean, page?: number, limit?: number) {
    const args = pageArgsFor(page, limit)
    const orderBy = { name: 'asc' as const }

    if (isOwner) {
      if (!args) return this.prisma.menuItem.findMany({ orderBy })
      const [data, total] = await Promise.all([
        this.prisma.menuItem.findMany({ orderBy, skip: args.skip, take: args.take }),
        this.prisma.menuItem.count(),
      ])
      return { data, total, page: args.page, limit: args.limit }
    }

    if (!args) return this.prisma.menuItem.findMany({ orderBy, select: CUSTOMER_SELECT })
    const [data, total] = await Promise.all([
      this.prisma.menuItem.findMany({ orderBy, select: CUSTOMER_SELECT, skip: args.skip, take: args.take }),
      this.prisma.menuItem.count(),
    ])
    return { data, total, page: args.page, limit: args.limit }
  }

  async create(dto: CreateMenuItemDto, editorAuth0Sub: string) {
    const after = await this.prisma.menuItem.create({ data: { ...dto, lastEditedBy: editorAuth0Sub } })
    await this.audit.log(editorAuth0Sub, 'menu.create', 'MenuItem', after.id, undefined, after)
    return after
  }

  async update(id: string, dto: UpdateMenuItemDto, editorAuth0Sub: string) {
    const before = await this.prisma.menuItem.findUnique({ where: { id } })
    const after = await this.prisma.menuItem.update({ where: { id }, data: { ...dto, lastEditedBy: editorAuth0Sub } })
    await this.audit.log(editorAuth0Sub, 'menu.update', 'MenuItem', id, before, after)
    // เปลี่ยนรูปเมนู — ลบไฟล์เก่าทิ้งกัน orphan สะสมบน disk (ไม่บล็อกแม้ลบไม่สำเร็จ)
    if (dto.image !== undefined && before?.image && before.image !== after.image) {
      await this.uploads.deleteManagedFile(before.image)
    }
    return after
  }

  /** ลบเมนู — จะหลุดออกจากทุก course ที่อ้างถึงโดยอัตโนมัติ (many-to-many) */
  async remove(id: string, editorAuth0Sub: string) {
    const before = await this.prisma.menuItem.delete({ where: { id } })
    await this.audit.log(editorAuth0Sub, 'menu.delete', 'MenuItem', id, before, undefined)
    await this.uploads.deleteManagedFile(before.image)
    return before
  }
}
