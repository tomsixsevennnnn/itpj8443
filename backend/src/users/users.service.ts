import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Role, type Shop, type User } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { resolveShopContext, type ShopContext } from '../auth/shop-context'
import type { VerifiedIdentity } from '../auth/userinfo'
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

export type { ShopContext }

/** ร้านที่เป็น owner อยู่ พร้อมข้อมูลร้านสั้นๆ — frontend ใช้เลือกว่าร้านที่เปิดอยู่เป็น owner หรือลูกค้า (ดู App.tsx) */
const MEMBERSHIPS_INCLUDE = {
  memberships: {
    orderBy: { createdAt: 'asc' as const },
    select: { shopId: true, shop: { select: { id: true, name: true, slug: true } } },
  },
}

type UserWithMemberships = User & { memberships: { shopId: string; shop: Pick<Shop, 'id' | 'name' | 'slug'> }[] }

/**
 * มุมมองผู้ใช้สำหรับหน้า "สิทธิ์การเข้าถึง"/ค้นหา — role = OWNER ถ้าเป็น owner ของร้าน scopeShopId (ไม่ระบุ = ร้านไหนก็ได้)
 * SUPER_ADMIN คงเดิม shopId/shop = ร้านที่ match (ถ้ามี) หน้าจอเดิมใช้ shape นี้อยู่แล้วจึงคงรูปเดิมไว้ ไม่ให้หน้าจอพัง
 */
function toRoleView(user: UserWithMemberships, scopeShopId?: string | null) {
  // เบอร์โทร/Line ID เป็นข้อมูลส่วนตัวของลูกค้า — owner ค้นหาผู้ใช้ข้ามร้านได้ (เพื่อเชิญมาเป็น owner) จึงไม่ส่งสองฟิลด์นี้ออกไป
  // หน้า "สิทธิ์การเข้าถึง" ไม่ได้ใช้ (ใช้แค่ชื่อ อีเมล วันที่สมัคร และ auth0Sub เทียบว่าเป็นตัวเองหรือไม่)
  const { memberships, phone: _phone, lineId: _lineId, ...rest } = user
  const member = scopeShopId ? memberships.find((m) => m.shopId === scopeShopId) : memberships[0]
  if (user.role === Role.SUPER_ADMIN || !member) return { ...rest, shopId: null, shop: null }
  return { ...rest, role: Role.OWNER, shopId: member.shopId, shop: member.shop }
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
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
  /** include memberships (ร้านที่เป็น owner อยู่ พร้อม slug) เสมอ — frontend ใช้เลือกว่าร้านที่เปิดอยู่เป็น owner หรือลูกค้า
   *  และปรับ URL ให้ตรงร้านหลัง login (ดู App.tsx) ไม่ต้องยิง request แยกอีกรอบ */
  async syncProfile(auth0Sub: string, role: Role, dto: SyncProfileDto, verifiedEmail?: string | null) {
    // อีเมลใน body มาจากหน้าเว็บ (ปลอมได้) — ใช้ตัดสินสิทธิ์/เขียนทับอีเมลใน DB ไม่ได้ ต้องเป็นอีเมลที่ Auth0 ยืนยันแล้ว
    // (ถามจาก /userinfo ด้วย token ของผู้เรียกเอง ดู users.controller.ts) ถามไม่ได้ = ไม่ให้สิทธิ์พิเศษ และไม่เขียนทับอีเมลเดิม
    const trusted = verifiedEmail?.trim() || null
    const existing = await this.prisma.user.findUnique({ where: { auth0Sub } })
    if (!existing) {
      // bootstrap super admin คนแรก — ถ้าอีเมลอยู่ใน SUPER_ADMIN_EMAILS ตั้งเป็น SUPER_ADMIN เสมอ ไม่ว่า role
      // ที่ส่งมาจะเป็นอะไร (ตอนนี้ผู้เรียก users.controller.ts ส่ง CUSTOMER มาตลอด — ไม่มีทางเป็น OWNER จากจุดนี้
      // อีกต่อไป เพราะ OWNER ต้องมาจาก ShopsService.createShop/addOwner เท่านั้นในระบบ multi-tenant)
      // ต้องเป็นอีเมลที่ Auth0 ยืนยันแล้วเท่านั้น — ไม่งั้นใครก็ส่งอีเมลของ super admin มาใน body แล้วได้สิทธิ์ทันที
      const finalRole = trusted && superAdminEmails().has(trusted.toLowerCase()) ? Role.SUPER_ADMIN : role
      return this.prisma.user.create({
        data: {
          auth0Sub,
          role: finalRole,
          name: dto.name,
          surname: dto.surname ?? '',
          // ถามอีเมลที่ยืนยันแล้วไม่ได้ (Auth0 ขัดข้อง) ค่อยใช้ที่ client ส่งมาเป็นค่าแสดงผลไปก่อน — ไม่ให้สิทธิ์อะไรจากค่านี้
          email: trusted ?? dto.email,
          avatar: dto.avatar ?? '',
        },
        include: MEMBERSHIPS_INCLUDE,
      })
    }
    return this.prisma.user.update({
      where: { auth0Sub },
      data: {
        // อีเมลอัปเดตเฉพาะเมื่อได้ค่าที่ Auth0 ยืนยัน — ไม่ให้ client ส่งอีเมลคนอื่นมาเขียนทับของตัวเอง (ใช้แย่งตำแหน่งเจ้าของร้านตอนถูกค้นด้วยอีเมลได้)
        email: trusted ?? (existing.email || dto.email),
        avatar: dto.avatar ?? '',
        ...(existing.name ? {} : { name: dto.name }),
        ...(existing.surname ? {} : { surname: dto.surname ?? '' }),
      },
      include: MEMBERSHIPS_INCLUDE,
    })
  }

  /** ผู้ใช้พร้อมร้านที่เป็น owner อยู่ (shape เดียวกับที่ syncProfile คืน) — ใช้อ่านซ้ำหลังรับสิทธิ์จากคำเชิญ */
  findWithMemberships(auth0Sub: string) {
    return this.prisma.user.findUnique({ where: { auth0Sub }, include: MEMBERSHIPS_INCLUDE })
  }

  /**
   * รับสิทธิ์เจ้าของร้านจากคำเชิญล่วงหน้า (ShopInvite) — เรียกหลัง sync ตอน login: ถ้าอีเมลของผู้เรียก (ถามจาก Auth0
   * ไม่ใช่ที่ frontend ส่ง) ยืนยันแล้วและตรงกับคำเชิญของร้านใด สร้าง ShopMember ให้แล้วลบคำเชิญ
   * ไม่มีคำเชิญเลยในระบบ = ข้ามทันที ไม่ได้ identity ที่ยืนยันแล้ว (Auth0 ถามไม่ได้) = ข้ามไป คำเชิญยังอยู่ ลองใหม่รอบ login ถัดไป
   * super admin ไม่รับ (เป็นเจ้าของร้านไม่ได้) คืน true ถ้ามีสิทธิ์ใหม่เกิดขึ้น
   */
  async claimOwnerInvites(auth0Sub: string, identity: VerifiedIdentity | null): Promise<boolean> {
    if ((await this.prisma.shopInvite.count()) === 0) return false
    const user = await this.prisma.user.findUnique({ where: { auth0Sub }, select: { id: true, role: true } })
    if (!user || user.role === Role.SUPER_ADMIN) return false

    if (!identity?.emailVerified) return false
    const email = identity.email.trim().toLowerCase()

    const invites = await this.prisma.shopInvite.findMany({ where: { email } })
    if (invites.length === 0) return false

    await this.prisma.$transaction([
      this.prisma.shopMember.createMany({ data: invites.map((i) => ({ userId: user.id, shopId: i.shopId })), skipDuplicates: true }),
      this.prisma.shopInvite.deleteMany({ where: { id: { in: invites.map((i) => i.id) } } }),
    ])
    for (const invite of invites) {
      await this.audit.log(auth0Sub, 'shop.addOwner', 'Shop', invite.shopId, undefined, { userId: user.id, email, via: 'invite' }, invite.shopId)
    }
    return true
  }

  updateProfile(auth0Sub: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { auth0Sub }, data: dto, include: MEMBERSHIPS_INCLUDE })
  }

  /** ตัวตน+บทบาทในร้านที่ request นี้เปิดอยู่ (requestedShopId จาก header X-Shop-Id) resolve จาก DB ครั้งเดียว ใช้ต่อใน
   *  controller ทุกจุดที่ต้อง scope query ด้วย shopId (bookings/menus/packages/settings/audit) — ดู resolveShopContext */
  shopContextFor(auth0Sub: string, requestedShopId?: string | null): Promise<ShopContext | null> {
    return resolveShopContext(this.prisma, auth0Sub, requestedShopId)
  }

  /** ค้นหา user ที่เคย login เข้าระบบมาแล้ว (มีแถวใน DB) ด้วยอีเมล ไม่ต้องพิมพ์ครบ — ใช้ทั้งหน้า "สิทธิ์การเข้าถึง"
   *  ของ owner (หา staff มาเชิญเข้าร้านตัวเอง — scopeShopId = ร้านของ owner คนนั้น) และหน้า super admin
   *  (หา owner คนแรกตอนสร้างร้านใหม่ — ไม่ส่ง scopeShopId) */
  async searchByEmail(email: string, scopeShopId?: string | null) {
    const users = await this.prisma.user.findMany({
      where: { email: { contains: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: MEMBERSHIPS_INCLUDE,
    })
    return users.map((u) => toRoleView(u, scopeShopId))
  }

  /** owner ทั้งหมดของร้านเดียว — ใช้ในหน้า "สิทธิ์การเข้าถึง" ของ owner (เห็นแค่ร้านตัวเอง) */
  async listOwnersForShop(shopId: string) {
    const members = await this.prisma.shopMember.findMany({
      where: { shopId },
      orderBy: { createdAt: 'asc' },
      include: { user: { include: MEMBERSHIPS_INCLUDE } },
    })
    return members.map((m) => toRoleView(m.user, shopId))
  }

  /** owner ทั้งหมดข้ามทุกร้าน (1 แถวต่อ 1 สมาชิกภาพ — คนเดียวเป็น owner หลายร้านจะโผล่หลายแถว) เฉพาะ super admin เห็นได้ */
  async listAllOwners() {
    const members = await this.prisma.shopMember.findMany({
      orderBy: { createdAt: 'asc' },
      include: { user: { include: MEMBERSHIPS_INCLUDE } },
    })
    return members.map((m) => toRoleView(m.user, m.shopId))
  }

  /**
   * เลื่อน/ถอดสิทธิ์ผู้ใช้ — ขอบเขตขึ้นกับว่าใครเป็นคนแก้ (editor):
   *  - OWNER แก้ได้แค่ CUSTOMER↔OWNER "ในร้านตัวเอง" เท่านั้น (promote = เพิ่ม ShopMember ของร้านตัวเอง,
   *    demote = ลบ ShopMember ร้านตัวเอง ต้องเหลือ owner อย่างน้อย 1 คน) แตะ SUPER_ADMIN หรือร้านอื่นไม่ได้เลย
   *    คนที่เป็น owner ร้านอื่นอยู่แล้วเลื่อนเป็น owner ร้านนี้เพิ่มได้ (1 คนเป็น owner ได้หลายร้าน)
   *  - SUPER_ADMIN แก้ได้แค่ CUSTOMER↔SUPER_ADMIN เท่านั้น — จะตั้งใครเป็น OWNER ต้องผ่าน ShopsService
   *    (createShop/addOwner) เพราะ OWNER ต้องผูกกับร้านใดร้านหนึ่งเสมอ ตั้งผ่าน endpoint นี้ตรงๆ ไม่ได้
   */
  private async setRoleAsOwner(editor: ShopContext, target: UserWithMemberships, role: Role) {
    const shopId = editor.shopId as string
    if (role === Role.SUPER_ADMIN || target.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('ไม่มีสิทธิ์แก้ไขบัญชีระดับ super admin')
    }
    const isMember = target.memberships.some((m) => m.shopId === shopId)

    if (role === Role.OWNER) {
      if (!isMember) await this.prisma.shopMember.create({ data: { userId: target.id, shopId } })
    } else {
      if (!isMember) throw new BadRequestException('ผู้ใช้นี้ไม่ใช่เจ้าของร้านนี้')
      const ownerCount = await this.prisma.shopMember.count({ where: { shopId } })
      if (ownerCount <= 1) throw new BadRequestException('ต้องมีเจ้าของร้านอย่างน้อย 1 คนเสมอ')
      await this.prisma.shopMember.delete({ where: { userId_shopId: { userId: target.id, shopId } } })
    }
    return { before: isMember ? Role.OWNER : Role.CUSTOMER, after: role }
  }

  private async setRoleAsSuperAdmin(target: UserWithMemberships, role: Role) {
    if (role === Role.OWNER || target.memberships.length > 0) {
      throw new BadRequestException('ตั้ง/ถอดสิทธิ์เจ้าของร้านต้องทำผ่านหน้าจัดการร้าน ไม่ใช่หน้านี้')
    }
    await this.prisma.user.update({ where: { id: target.id }, data: { role } })
    return { before: target.role, after: role }
  }

  async setRole(id: string, role: Role, editorAuth0Sub: string, editor: ShopContext) {
    const target = await this.prisma.user.findUnique({ where: { id }, include: MEMBERSHIPS_INCLUDE })
    if (!target) throw new NotFoundException('ไม่พบผู้ใช้นี้')

    let change: { before: Role; after: Role }
    if (editor.role === Role.OWNER) change = await this.setRoleAsOwner(editor, target, role)
    else if (editor.role === Role.SUPER_ADMIN) change = await this.setRoleAsSuperAdmin(target, role)
    else throw new BadRequestException('ไม่มีสิทธิ์เปลี่ยนสิทธิ์ผู้ใช้')

    // เปลี่ยนสิทธิ์กระทบการเข้าถึงโดยตรง — ต้องมี audit log ว่าใครเลื่อน/ถอดสิทธิ์ให้ใครเมื่อไหร่
    await this.audit.log(editorAuth0Sub, 'user.setRole', 'User', id, { role: change.before }, { role: change.after }, editor.shopId)
    const fresh = await this.prisma.user.findUnique({ where: { id }, include: MEMBERSHIPS_INCLUDE })
    return toRoleView(fresh ?? target, editor.shopId)
  }
}
