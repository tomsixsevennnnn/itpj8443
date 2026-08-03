import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePackageDto } from './dto/create-package.dto'
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
}
