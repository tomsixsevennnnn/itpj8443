import { Injectable, Logger } from '@nestjs/common'
import { Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

/** บันทึกประวัติการลบ/แก้ไขข้อมูลสำคัญโดย owner — ทุก call site ตอนนี้อยู่หลัง @Roles('owner') อยู่แล้ว จึงไม่ต้องรับ role จาก caller เอง แค่ auth0Sub พอ */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private prisma: PrismaService) {}

  async log(
    auth0Sub: string,
    action: string,
    entityType: string,
    entityId: string,
    before?: unknown,
    after?: unknown,
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { auth0Sub }, select: { id: true, role: true } })
      await this.prisma.auditLog.create({
        data: {
          actorUserId: user?.id ?? auth0Sub,
          actorRole: user?.role ?? Role.OWNER,
          action,
          entityType,
          entityId,
          before: (before ?? undefined) as any,
          after: (after ?? undefined) as any,
        },
      })
    } catch (err) {
      // การเขียน audit log ต้องไม่มีวันบล็อกการทำงานจริง (ลบเมนู/แก้ booking) แม้บันทึกประวัติไม่สำเร็จ
      this.logger.warn(`เขียน audit log ไม่สำเร็จ (action=${action} entity=${entityType}:${entityId})`, err as Error)
    }
  }

  async findPage(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.auditLog.count(),
    ])
    return { items, total, page, pageSize }
  }
}
