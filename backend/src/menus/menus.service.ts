import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { pageArgsFor } from '../common/pagination'
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
  constructor(private prisma: PrismaService) {}

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

  create(dto: CreateMenuItemDto, editorAuth0Sub: string) {
    return this.prisma.menuItem.create({ data: { ...dto, lastEditedBy: editorAuth0Sub } })
  }

  update(id: string, dto: UpdateMenuItemDto, editorAuth0Sub: string) {
    return this.prisma.menuItem.update({ where: { id }, data: { ...dto, lastEditedBy: editorAuth0Sub } })
  }

  /** ลบเมนู — จะหลุดออกจากทุก course ที่อ้างถึงโดยอัตโนมัติ (many-to-many) */
  remove(id: string) {
    return this.prisma.menuItem.delete({ where: { id } })
  }
}
