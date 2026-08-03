import { Injectable } from '@nestjs/common'
import { Role } from '@prisma/client'
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
  constructor(private prisma: PrismaService) {}

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
}
