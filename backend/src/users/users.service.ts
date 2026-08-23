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

  /** เรียกทันทีหลัง login ทุกครั้ง — ฝั่ง frontend ส่ง profile จาก ID token มาเอง (access token ไม่มี name/email/picture) */
  syncProfile(auth0Sub: string, role: Role, dto: SyncProfileDto) {
    return this.prisma.user.upsert({
      where: { auth0Sub },
      update: {
        name: dto.name,
        surname: dto.surname ?? '',
        email: dto.email,
        avatar: dto.avatar ?? '',
      },
      create: {
        auth0Sub,
        role,
        name: dto.name,
        surname: dto.surname ?? '',
        email: dto.email,
        avatar: dto.avatar ?? '',
      },
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

  /** ค้นหา user ที่เคย login เข้าระบบมาแล้ว (มีแถวใน DB) ด้วยอีเมล ไม่ต้องพิมพ์ครบ — ใช้หน้า "สิทธิ์การเข้าถึง" ของ owner */
  searchByEmail(email: string) {
    return this.prisma.user.findMany({
      where: { email: { contains: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }

  listOwners() {
    return this.prisma.user.findMany({ where: { role: Role.OWNER }, orderBy: { createdAt: 'asc' } })
  }

  /** เลื่อน/ถอดสิทธิ์ owner — กันเหลือ owner 0 คน (ระบบจะไม่มีใครเข้าหน้าเจ้าของร้านได้อีก) */
  async setRole(id: string, role: Role, editorAuth0Sub: string) {
    const target = await this.prisma.user.findUnique({ where: { id } })
    if (!target) throw new NotFoundException('ไม่พบผู้ใช้นี้')

    if (target.role === Role.OWNER && role === Role.CUSTOMER) {
      const ownerCount = await this.prisma.user.count({ where: { role: Role.OWNER } })
      if (ownerCount <= 1) throw new BadRequestException('ต้องมีเจ้าของร้านอย่างน้อย 1 คนเสมอ')
    }

    const after = await this.prisma.user.update({ where: { id }, data: { role } })
    // เปลี่ยน role กระทบสิทธิ์เข้าถึงโดยตรง — ต้องมี audit log ว่าใครเลื่อน/ถอด owner ให้ใครเมื่อไหร่
    await this.audit.log(editorAuth0Sub, 'user.setRole', 'User', id, { role: target.role }, { role: after.role })
    return after
  }
}
