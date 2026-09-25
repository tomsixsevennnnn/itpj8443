import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Role } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { SyncProfileDto } from './dto/sync-profile.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

interface Auth0Profile {
  auth0Sub: string
  role: Role
  name: string
  surname?: string
  email: string
  avatar?: string
}

/** ผู้ใช้ที่กำลังยิง request มา — ใช้ตัดสินว่าแก้/ดูข้อมูลร้านไหนได้บ้าง (ดู shopContextFor) */
export interface ShopContext {
  id: string
  role: Role
  shopId: string | null
}

/** อีเมลที่กำหนดไว้ล่วงหน้าให้เป็น SUPER_ADMIN ทันทีที่ login/sync ครั้งแรก (bootstrap คนแรกของระบบ — หลังจากนั้น
 *  super admin คนแรกเพิ่มคนต่อไปได้เองผ่านหน้า super admin) คั่นด้วย comma ใน env, เทียบแบบไม่สนตัวพิมพ์ใหญ่-เล็ก */
const superAdminEmails = (): Set<string> =>
  new Set(
    (process.env.SUPER_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * ใช้ที่อื่นตอนสร้างข้อมูลที่ผูกกับ user (เช่น booking) — access token ไม่มี profile claim
   * จึงมักได้ชื่อ/อีเมลว่างตรงนี้ แต่ไม่เป็นไรเพราะ syncProfile (เรียกตอน login) จะอัปเดตให้ถูกอยู่แล้ว
   */
  async findOrCreate(profile: Auth0Profile) {
    const existing = await this.prisma.user.findUnique({ where: { auth0Sub: profile.auth0Sub } })
    if (existing) return existing

    return this.prisma.user.create({
      data: {
        auth0Sub: profile.auth0Sub,
        role: profile.role,
        name: profile.name,
        surname: profile.surname ?? '',
        email: profile.email,
        avatar: profile.avatar ?? '',
      },
    })
  }

  /**
   * เรียกทันทีหลัง login ทุกครั้ง — ฝั่ง frontend ส่ง profile จาก ID token มาเอง (access token ไม่มี name/email/picture)
   * name/surname sync จาก Auth0 (Google) เฉพาะตอนที่ DB ยังว่างอยู่เท่านั้น (สร้างครั้งแรก หรือช่องไหนหายไปทีหลัง)
   * ถ้ามีค่าอยู่แล้วไม่เขียนทับ เพราะผู้ใช้อาจแก้ชื่อเองผ่าน updateProfile() (หน้า CompleteProfile) ซึ่งควรเป็นความจริง
   * หลักกว่าค่าจาก Google เดิม syncProfile เขียนทับ name/surname ทุกครั้งที่ login ทำให้ชื่อที่แก้ไว้หายกลับไปเป็น
   * ของ Google ทุกครั้ง — email/avatar ยังคง sync ทับได้ทุกครั้งเพราะไม่มีจุดให้ผู้ใช้แก้เอง (มาจาก Google อย่างเดียว)
   */
  /** include shop เสมอ (แม้ role อื่นจะได้ null) — frontend ใช้ shop.slug ของ owner ปรับ URL ให้ตรงร้านหลัง login
   *  (ดู App.tsx) ไม่ต้องยิง request แยกอีกรอบแค่เพื่อเอา slug */
  async syncProfile(auth0Sub: string, role: Role, dto: SyncProfileDto) {
    const existing = await this.prisma.user.findUnique({ where: { auth0Sub } })
    if (!existing) {
      // bootstrap super admin คนแรก — ถ้าอีเมลอยู่ใน SUPER_ADMIN_EMAILS ตั้งเป็น SUPER_ADMIN เสมอ ไม่ว่า role
      // ที่ส่งมาจะเป็นอะไร (ตอนนี้ผู้เรียก users.controller.ts ส่ง CUSTOMER มาตลอด — ไม่มีทางเป็น OWNER จากจุดนี้
      // อีกต่อไป เพราะ OWNER ต้องมาจาก ShopsService.createShop/addOwner เท่านั้นในระบบ multi-tenant)
      const finalRole = superAdminEmails().has(dto.email.toLowerCase()) ? Role.SUPER_ADMIN : role
      return this.prisma.user.create({
        data: {
          auth0Sub,
          role: finalRole,
          name: dto.name,
          surname: dto.surname ?? '',
          email: dto.email,
          avatar: dto.avatar ?? '',
        },
        include: { shop: true },
      })
    }
    return this.prisma.user.update({
      where: { auth0Sub },
      data: {
        email: dto.email,
        avatar: dto.avatar ?? '',
        ...(existing.name ? {} : { name: dto.name }),
        ...(existing.surname ? {} : { surname: dto.surname ?? '' }),
      },
      include: { shop: true },
    })
  }

  updateProfile(auth0Sub: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { auth0Sub }, data: dto })
  }

  /** ตรวจ role จาก DB ล้วนๆ — ใช้แทนการเชื่อ JWT role claim ตรงๆ ในทุก controller (กัน token เก่า/ปลอมอ้าง role ผิด) */
  async isOwner(auth0Sub: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { auth0Sub }, select: { role: true } })
    return user?.role === Role.OWNER
  }

  async isSuperAdmin(auth0Sub: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { auth0Sub }, select: { role: true } })
    return user?.role === Role.SUPER_ADMIN
  }

  /** ตัวตน+ร้านของผู้เรียก resolve จาก DB ครั้งเดียว ใช้ต่อใน controller ทุกจุดที่ต้อง scope query ด้วย shopId
   *  (bookings/menus/packages/settings/audit) แทนการเชื่อ JWT claim ที่ไม่มี shopId อยู่แล้วด้วยซ้ำ */
  async shopContextFor(auth0Sub: string): Promise<ShopContext | null> {
    const user = await this.prisma.user.findUnique({ where: { auth0Sub }, select: { id: true, role: true, shopId: true } })
    return user
  }

  /** ค้นหา user ที่เคย login เข้าระบบมาแล้ว (มีแถวใน DB) ด้วยอีเมล ไม่ต้องพิมพ์ครบ — ใช้ทั้งหน้า "สิทธิ์การเข้าถึง"
   *  ของ owner (หา staff มาเชิญเข้าร้านตัวเอง) และหน้า super admin (หา owner คนแรกตอนสร้างร้านใหม่) */
  searchByEmail(email: string) {
    return this.prisma.user.findMany({
      where: { email: { contains: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }

  /** owner ทั้งหมดของร้านเดียว — ใช้ในหน้า "สิทธิ์การเข้าถึง" ของ owner (เห็นแค่ร้านตัวเอง) */
  listOwnersForShop(shopId: string) {
    return this.prisma.user.findMany({ where: { role: Role.OWNER, shopId }, orderBy: { createdAt: 'asc' } })
  }

  /** owner ทั้งหมดข้ามทุกร้าน — เฉพาะ super admin เห็นได้ (หน้าจัดการร้าน/บัญชีระดับระบบ) */
  listAllOwners() {
    return this.prisma.user.findMany({ where: { role: Role.OWNER }, orderBy: { createdAt: 'asc' }, include: { shop: true } })
  }

  /**
   * เลื่อน/ถอดสิทธิ์ผู้ใช้ — ขอบเขตขึ้นกับว่าใครเป็นคนแก้ (editor):
   *  - OWNER แก้ได้แค่ CUSTOMER↔OWNER "ในร้านตัวเอง" เท่านั้น (promote = ผูก shopId ให้เป็นร้านตัวเอง,
   *    demote = ต้องเป็น owner ร้านเดียวกันอยู่แล้ว แล้วเคลียร์ shopId ทิ้ง) แตะ SUPER_ADMIN หรือร้านอื่นไม่ได้เลย
   *  - SUPER_ADMIN แก้ได้แค่ CUSTOMER↔SUPER_ADMIN เท่านั้น — จะตั้งใครเป็น OWNER ต้องผ่าน ShopsService
   *    (createShop/addOwner) เพราะ OWNER ต้องมี shopId คู่กันเสมอ ตั้งผ่าน endpoint นี้ตรงๆ ไม่ได้
   */
  async setRole(id: string, role: Role, editorAuth0Sub: string, editor: ShopContext) {
    const target = await this.prisma.user.findUnique({ where: { id } })
    if (!target) throw new NotFoundException('ไม่พบผู้ใช้นี้')

    if (editor.role === Role.OWNER) {
      if (role === Role.SUPER_ADMIN || target.role === Role.SUPER_ADMIN) {
        throw new BadRequestException('ไม่มีสิทธิ์แก้ไขบัญชีระดับ super admin')
      }
      if (role === Role.OWNER && target.role !== Role.CUSTOMER) {
        throw new BadRequestException('เลื่อนสิทธิ์ได้เฉพาะบัญชีลูกค้าเท่านั้น')
      }
      if (target.role === Role.OWNER && target.shopId !== editor.shopId) {
        throw new BadRequestException('ไม่มีสิทธิ์แก้ไขผู้ใช้ร้านอื่น')
      }
      if (target.role === Role.OWNER && role === Role.CUSTOMER) {
        const ownerCount = await this.prisma.user.count({ where: { role: Role.OWNER, shopId: editor.shopId } })
        if (ownerCount <= 1) throw new BadRequestException('ต้องมีเจ้าของร้านอย่างน้อย 1 คนเสมอ')
      }
    } else if (editor.role === Role.SUPER_ADMIN) {
      if (role === Role.OWNER || target.role === Role.OWNER) {
        throw new BadRequestException('ตั้ง/ถอดสิทธิ์เจ้าของร้านต้องทำผ่านหน้าจัดการร้าน ไม่ใช่หน้านี้')
      }
    }

    const shopId = editor.role === Role.OWNER && role === Role.OWNER ? editor.shopId : role === Role.CUSTOMER ? null : target.shopId
    const after = await this.prisma.user.update({ where: { id }, data: { role, shopId } })
    // เปลี่ยน role กระทบสิทธิ์เข้าถึงโดยตรง — ต้องมี audit log ว่าใครเลื่อน/ถอดสิทธิ์ให้ใครเมื่อไหร่
    await this.audit.log(editorAuth0Sub, 'user.setRole', 'User', id, { role: target.role }, { role: after.role }, editor.shopId)
    return after
  }
}
