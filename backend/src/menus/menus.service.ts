import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.menuItem.findMany({ orderBy: { name: 'asc' } })
  }

  create(dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({ data: dto })
  }

  update(id: string, dto: UpdateMenuItemDto) {
    return this.prisma.menuItem.update({ where: { id }, data: dto })
  }

  /** ลบเมนู — จะหลุดออกจากทุก course ที่อ้างถึงโดยอัตโนมัติ (many-to-many) */
  remove(id: string) {
    return this.prisma.menuItem.delete({ where: { id } })
  }
}
