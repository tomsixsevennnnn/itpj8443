import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Role, ShopStatus } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { DEFAULT_SETTINGS } from '../settings/settings.service'
import { CreateShopDto } from './dto/create-shop.dto'

/** slug ต้องมีแค่ a-z 0-9 และ - เท่านั้น (ใช้ต่อ URL /shop/:slug ให้ลูกค้า) — แปลงจากชื่อร้านภาษาไทย/อังกฤษ
 *  ยังไงก็ได้ ตัดอักขระที่พิมพ์ไม่ได้ทิ้ง เหลือแค่ตัวเลข/อังกฤษ ถ้าไม่เหลือเลย fallback เป็น "shop" */
const slugify = (name: string): string => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'shop'
}

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** เฉพาะ super admin เรียกได้ — เห็นทุกร้านข้ามระบบ พร้อมจำนวน owner ของแต่ละร้าน */
  listAll() {
    return this.prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { owners: true } } },
    })
  }

  /** ร้านที่เปิดให้บริการอยู่ — ใช้หน้ารายชื่อร้านฝั่งลูกค้า (ไม่ต้อง login) */
  listActivePublic() {
    return this.prisma.shop.findMany({
      where: { status: ShopStatus.ACTIVE },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    })
  }

  async findBySlugPublic(slug: string) {
    const shop = await this.prisma.shop.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, status: true } })
    if (!shop || shop.status !== ShopStatus.ACTIVE) throw new NotFoundException('ไม่พบร้านนี้ หรือร้านปิดให้บริการชั่วคราว')
    return shop
  }

  /**
   * สร้างร้านใหม่ + ผูก owner คนแรกให้ทันทีในทรานแซกชันเดียว — owner ต้องเคย login เข้าระบบมาก่อนอย่างน้อย 1
   * ครั้งแล้ว (มีแถวใน User ตารางจาก syncProfile) ถึงจะหาเจอด้วยอีเมล ยังไม่เคย login มาก่อนเลยสร้างร้านให้ไม่ได้
   * เพราะไม่มี auth0Sub ให้ผูก — ต้องให้ user คนนั้น login เข้าเว็บครั้งนึงก่อน (เป็น CUSTOMER ธรรมดา) แล้วค่อยมาสร้างร้าน
   */
  async createShop(dto: CreateShopDto, editorAuth0Sub: string) {
    const owner = await this.prisma.user.findFirst({ where: { email: { equals: dto.ownerEmail, mode: 'insensitive' } } })
    if (!owner) {
      throw new NotFoundException('ไม่พบผู้ใช้นี้ในระบบ — ต้องให้เจ้าของร้านคนนี้ login เข้าเว็บอย่างน้อย 1 ครั้งก่อน')
    }
    if (owner.role !== Role.CUSTOMER) {
      throw new BadRequestException('ผู้ใช้นี้มีบทบาทอื่นอยู่แล้ว (เจ้าของร้านอื่น หรือ super admin) ไม่สามารถตั้งเป็นเจ้าของร้านใหม่ได้')
    }

    const baseSlug = slugify(dto.name)
    let slug = baseSlug
    for (let i = 2; await this.prisma.shop.findUnique({ where: { slug } }); i++) {
      slug = `${baseSlug}-${i}`
    }

    const shop = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shop.create({ data: { name: dto.name, slug } })
      await tx.settings.create({ data: { ...DEFAULT_SETTINGS, shopId: created.id, shopName: dto.name } })
      await tx.user.update({ where: { id: owner.id }, data: { role: Role.OWNER, shopId: created.id } })
      return created
    })

    await this.audit.log(editorAuth0Sub, 'shop.create', 'Shop', shop.id, undefined, shop, shop.id)
    return shop
  }

  async setStatus(id: string, status: ShopStatus, editorAuth0Sub: string) {
    const before = await this.prisma.shop.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('ไม่พบร้านนี้')

    const after = await this.prisma.shop.update({ where: { id }, data: { status } })
    await this.audit.log(editorAuth0Sub, 'shop.setStatus', 'Shop', id, before, after, id)
    return after
  }

  /** ผูก owner เพิ่มเข้าร้านที่มีอยู่แล้ว (เช่นเพิ่มผู้ช่วยดูแลร้าน) — ผู้ใช้ต้อง login มาก่อนแล้วและยังไม่มีร้านอื่นผูกอยู่ */
  async addOwner(shopId: string, email: string, editorAuth0Sub: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } })
    if (!shop) throw new NotFoundException('ไม่พบร้านนี้')

    const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้นี้ในระบบ — ต้อง login เข้าเว็บอย่างน้อย 1 ครั้งก่อน')
    if (user.role !== Role.CUSTOMER) throw new ConflictException('ผู้ใช้นี้มีบทบาทอื่นอยู่แล้ว ไม่สามารถเพิ่มเป็นเจ้าของร้านนี้ได้')

    const after = await this.prisma.user.update({ where: { id: user.id }, data: { role: Role.OWNER, shopId } })
    await this.audit.log(editorAuth0Sub, 'shop.addOwner', 'Shop', shopId, undefined, { userId: user.id, email }, shopId)
    return after
  }

  /** ถอด owner ออกจากร้าน (กลับไปเป็น CUSTOMER ธรรมดา) — super admin เท่านั้น ไม่บังคับต้องเหลือ owner อย่างน้อย
   *  1 คนเหมือนตอน owner ถอดกันเอง (setRole) เพราะ super admin มีสิทธิ์เต็มอยู่แล้ว เพิ่ม owner คนใหม่เข้าไปทีหลังได้เสมอ */
  async removeOwner(shopId: string, userId: string, editorAuth0Sub: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้นี้')
    if (user.role !== Role.OWNER || user.shopId !== shopId) {
      throw new BadRequestException('ผู้ใช้นี้ไม่ใช่เจ้าของร้านนี้')
    }

    const after = await this.prisma.user.update({ where: { id: userId }, data: { role: Role.CUSTOMER, shopId: null } })
    await this.audit.log(editorAuth0Sub, 'shop.removeOwner', 'Shop', shopId, { userId, email: user.email }, undefined, shopId)
    return after
  }
}
