import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Role, ShopStatus } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { DEFAULT_SETTINGS } from '../settings/settings.service'
import { CreateShopDto } from './dto/create-shop.dto'
import { UpdateShopDto } from './dto/update-shop.dto'

/**
 * แปลงเป็น slug สำหรับต่อ URL (/pipat-catering หรือ /โต๊ะจีนพิพัฒน์โภชนา ก็ได้) — เก็บตัวอักษรทุกภาษา (รวมไทย)
 * และตัวเลขไว้ ตัดเฉพาะช่องว่าง/สัญลักษณ์ที่ใช้ใน URL ตรงๆ ไม่ได้ (/ ? # & = ฯลฯ) แทนด้วย "-" แทน เพราะ browser
 * สมัยใหม่แสดง Unicode ใน URL ได้ปกติ (IRI) ไม่จำเป็นต้องบังคับ ASCII-only เหมือนเดิม ถ้าพิมพ์มาแล้วไม่เหลือ
 * อักขระที่ใช้ได้เลย fallback เป็น "shop" กันได้ slug ว่างเปล่า
 */
const slugify = (name: string): string => {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[\s/?#&=%+]+/gu, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
  return base || 'shop'
}

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** เฉพาะ super admin เรียกได้ — เห็นทุกร้านข้ามระบบ พร้อมจำนวน owner/booking และยอดขายรวมของแต่ละร้าน (สรุป
   *  ภาพรวมให้เทียบกันได้ในหน้าเดียว ไม่ต้องเข้าไปดูทีละร้าน) — ยอดขายรวมคิดจาก totalPrice ของทุกใบจองที่ไม่ถูก
   *  ยกเลิก (ยกเลิกแล้วไม่ควรนับเป็นรายได้จริง) แยก query ต่างหากเพราะ Prisma ไม่รองรับ conditional sum ใน include */
  async listAll() {
    const [shops, revenueByShop] = await Promise.all([
      this.prisma.shop.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { members: true, bookings: true } } },
      }),
      this.prisma.booking.groupBy({
        by: ['shopId'],
        where: { status: { not: 'CANCELLED' } },
        _sum: { totalPrice: true },
      }),
    ])
    const revenueMap = new Map(revenueByShop.map((r) => [r.shopId, r._sum.totalPrice ?? 0]))
    // หน้า super admin ใช้ _count.owners มาตั้งแต่ก่อนมี ShopMember — แปลงชื่อกลับให้ตรง contract เดิม
    return shops.map(({ _count, ...s }) => ({
      ...s,
      _count: { owners: _count.members, bookings: _count.bookings },
      totalRevenue: revenueMap.get(s.id) ?? 0,
    }))
  }

  /** ร้านที่เปิดให้บริการอยู่ — ใช้หน้ารายชื่อร้านฝั่งลูกค้า (ไม่ต้อง login) */
  listActivePublic() {
    return this.prisma.shop.findMany({
      where: { status: ShopStatus.ACTIVE },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    })
  }

  /** เทียบ slug แบบไม่สนตัวพิมพ์ใหญ่-เล็ก — กันเคสมีคนพิมพ์ URL เองด้วยตัวพิมพ์ใหญ่ (สำหรับ slug ภาษาอังกฤษ,
   *  ภาษาไทยไม่มีเคสนี้อยู่แล้ว) findUnique ทำแบบนี้ไม่ได้ตรงๆ ต้องใช้ findFirst + mode: insensitive แทน */
  async findBySlugPublic(slug: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug: { equals: slug, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true, status: true },
    })
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
    if (owner.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('ผู้ใช้นี้เป็น super admin ไม่สามารถตั้งเป็นเจ้าของร้านได้')
    }

    const baseSlug = slugify(dto.name)
    let slug = baseSlug
    let suffix = 2
    while (await this.prisma.shop.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`
      suffix++
    }

    const shop = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shop.create({ data: { name: dto.name, slug } })
      await tx.settings.create({ data: { ...DEFAULT_SETTINGS, shopId: created.id, shopName: dto.name } })
      await tx.shopMember.create({ data: { userId: owner.id, shopId: created.id } })
      return created
    })

    await this.audit.log(editorAuth0Sub, 'shop.create', 'Shop', shop.id, undefined, shop, shop.id)
    return shop
  }

  /** แก้ชื่อร้าน และ/หรือ slug (path เฉพาะร้าน เช่น /pipat-catering) — slug เปลี่ยนแล้วลิงก์เก่าที่แจกไปแล้วใช้ไม่ได้
   *  อีกต่อไป (ตั้งใจให้ super admin เป็นคนตัดสินใจเอง ไม่ auto-แก้ตามชื่อให้ กันลิงก์ที่แชร์ไปแล้วพังโดยไม่ตั้งใจ)
   *  ไม่ส่ง slug มา = ไม่แตะ slug เดิม */
  async updateShop(id: string, dto: UpdateShopDto, editorAuth0Sub: string) {
    const before = await this.prisma.shop.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('ไม่พบร้านนี้')

    let slug: string | undefined
    if (dto.slug !== undefined) {
      slug = slugify(dto.slug)
      const taken = await this.prisma.shop.findUnique({ where: { slug } })
      if (taken && taken.id !== id) throw new ConflictException(`path "/${slug}" มีร้านอื่นใช้อยู่แล้ว ลองตั้งชื่ออื่น`)
    }

    const after = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shop.update({ where: { id }, data: { name: dto.name, slug } })
      // ชื่อร้านที่ super admin แก้ ต้องซิงค์กับ Settings.shopName ที่ owner เห็น/แก้ในหน้าตั้งค่า กันสองหน้าโชว์ชื่อไม่ตรงกัน
      if (dto.name !== undefined && dto.name !== before.name) {
        await tx.settings.update({ where: { shopId: id }, data: { shopName: dto.name, version: { increment: 1 } } })
      }
      return updated
    })
    await this.audit.log(editorAuth0Sub, 'shop.update', 'Shop', id, before, after, id)
    return after
  }

  async setStatus(id: string, status: ShopStatus, editorAuth0Sub: string) {
    const before = await this.prisma.shop.findUnique({ where: { id } })
    if (!before) throw new NotFoundException('ไม่พบร้านนี้')

    const after = await this.prisma.shop.update({ where: { id }, data: { status } })
    await this.audit.log(editorAuth0Sub, 'shop.setStatus', 'Shop', id, before, after, id)
    return after
  }

  /** ผูก owner เพิ่มเข้าร้านที่มีอยู่แล้ว (เช่นเพิ่มผู้ช่วยดูแลร้าน) — ผู้ใช้ต้อง login มาก่อนแล้ว เป็น owner ร้านอื่นอยู่แล้วก็ได้
   *  (1 คนเป็น owner ได้หลายร้าน) แต่ต้องไม่ใช่ owner ร้านนี้อยู่แล้ว */
  async addOwner(shopId: string, email: string, editorAuth0Sub: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } })
    if (!shop) throw new NotFoundException('ไม่พบร้านนี้')

    const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้นี้ในระบบ — ต้อง login เข้าเว็บอย่างน้อย 1 ครั้งก่อน')
    if (user.role === Role.SUPER_ADMIN) throw new ConflictException('ผู้ใช้นี้เป็น super admin ไม่สามารถเพิ่มเป็นเจ้าของร้านได้')
    const existing = await this.prisma.shopMember.findUnique({ where: { userId_shopId: { userId: user.id, shopId } } })
    if (existing) throw new ConflictException('ผู้ใช้นี้เป็นเจ้าของร้านนี้อยู่แล้ว')

    await this.prisma.shopMember.create({ data: { userId: user.id, shopId } })
    await this.audit.log(editorAuth0Sub, 'shop.addOwner', 'Shop', shopId, undefined, { userId: user.id, email }, shopId)
    return { ...user, role: Role.OWNER, shopId }
  }

  /** ถอด owner ออกจากร้านนี้ (ลบ ShopMember — ยังเป็น owner ร้านอื่นและลูกค้าได้ตามปกติ) — super admin เท่านั้น ไม่บังคับต้องเหลือ owner อย่างน้อย
   *  1 คนเหมือนตอน owner ถอดกันเอง (setRole) เพราะ super admin มีสิทธิ์เต็มอยู่แล้ว เพิ่ม owner คนใหม่เข้าไปทีหลังได้เสมอ */
  async removeOwner(shopId: string, userId: string, editorAuth0Sub: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้นี้')
    const member = await this.prisma.shopMember.findUnique({ where: { userId_shopId: { userId, shopId } } })
    if (!member) throw new BadRequestException('ผู้ใช้นี้ไม่ใช่เจ้าของร้านนี้')

    await this.prisma.shopMember.delete({ where: { id: member.id } })
    await this.audit.log(editorAuth0Sub, 'shop.removeOwner', 'Shop', shopId, { userId, email: user.email }, undefined, shopId)
    return user
  }

  /**
   * ลบร้านถาวร — ทำลายข้อมูลจริงของร้านนี้ทั้งหมด (booking/เมนู/แพ็กเกจ/settings/audit log ผูก onDelete: Cascade
   * ไว้ที่ Shop อยู่แล้วในระดับ DB) กู้คืนไม่ได้ จึงบังคับให้พิมพ์ชื่อร้านมายืนยันตรงตัวเป๊ะก่อนเสมอ (เช็คซ้ำฝั่ง
   * backend ด้วย ไม่ไว้ใจแค่ฝั่ง frontend เพราะเรียก API ตรงๆ ข้าม UI ได้อยู่ดี) — ShopMember ของร้านนี้ถูกลบตามไปด้วย
   * (onDelete: Cascade) บัญชีผู้ใช้ไม่ถูกแตะ
   */
  async deleteShop(id: string, confirmName: string, editorAuth0Sub: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } })
    if (!shop) throw new NotFoundException('ไม่พบร้านนี้')
    if (confirmName !== shop.name) {
      throw new BadRequestException('ข้อความยืนยันไม่ตรงกับชื่อร้าน กรุณาพิมพ์ให้ตรงตัวเป๊ะ')
    }

    await this.prisma.shop.delete({ where: { id } })

    // shopId ต้องเป็น null เท่านั้น (ไม่ใช่ id ร้านที่เพิ่งลบไป) — AuditLog.shopId ผูก onDelete: Cascade กับ Shop
    // ไว้ด้วย ถ้าใส่ id ร้านที่ลบไปแล้ว ประวัติการลบนี้เองจะถูก cascade ลบตามไปทันที ไม่เหลือหลักฐานอะไรเลย
    await this.audit.log(editorAuth0Sub, 'shop.delete', 'Shop', id, shop, undefined, null)
    return { id }
  }
}
