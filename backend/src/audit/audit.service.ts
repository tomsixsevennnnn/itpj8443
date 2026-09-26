import { Injectable, Logger } from '@nestjs/common'
import { Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AppChangeTopic, RealtimeService } from '../realtime/realtime.service'

/** entityType ที่ call site ส่งเข้ามา -> topic realtime ที่ต้องแจ้ง client ให้ refetch (ดู RealtimeService)
 *  'Booking' ไม่อยู่ในนี้เพราะ bookings.service.ts ยิง emitBookingsChanged() ของตัวเองอยู่แล้วโดยตรง */
const ENTITY_TOPIC: Record<string, AppChangeTopic> = {
  Settings: 'settings',
  Package: 'catalog',
  MenuItem: 'catalog',
  User: 'users',
  Shop: 'shop',
}

/** บันทึกประวัติการลบ/แก้ไขข้อมูลสำคัญโดย owner — ทุก call site ตอนนี้อยู่หลัง @Roles('owner') อยู่แล้ว จึงไม่ต้องรับ role จาก caller เอง แค่ auth0Sub พอ */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  async log(
    auth0Sub: string,
    action: string,
    entityType: string,
    entityId: string,
    before?: unknown,
    after?: unknown,
    /** ร้านที่ action นี้เกิดขึ้น — null/undefined = action ระดับ super admin ที่ไม่ผูกกับร้านไหน (เช่นสร้างร้านใหม่) */
    shopId?: string | null,
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { auth0Sub }, select: { id: true, role: true, email: true } })
      await this.prisma.auditLog.create({
        data: {
          shopId: shopId ?? undefined,
          actorUserId: user?.id ?? auth0Sub,
          actorRole: user?.role ?? Role.OWNER,
          actorEmail: user?.email ?? '',
          action,
          entityType,
          entityId,
          before: (before ?? undefined) as any,
          after: (after ?? undefined) as any,
        },
      })
      // แจ้งหน้าประวัติการแก้ไขที่เปิดค้างไว้เสมอ บวก topic เฉพาะเจาะจงถ้า entity นี้มีหน้าที่ต้อง refetch ทันที
      this.realtime.emitAppChanged('audit')
      const topic = ENTITY_TOPIC[entityType]
      if (topic) this.realtime.emitAppChanged(topic)
    } catch (err) {
      // การเขียน audit log ต้องไม่มีวันบล็อกการทำงานจริง (ลบเมนู/แก้ booking) แม้บันทึกประวัติไม่สำเร็จ
      this.logger.warn(`เขียน audit log ไม่สำเร็จ (action=${action} entity=${entityType}:${entityId})`, err as Error)
    }
  }

  /** shopId = null → ประวัติทั้งหมดข้ามทุกร้าน (เฉพาะ super admin เรียกทางนี้) */
  async findPage(page: number, pageSize: number, shopId: string | null) {
    const skip = (page - 1) * pageSize
    const where = shopId ? { shopId } : {}
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.auditLog.count({ where }),
    ])
    return { items, total, page, pageSize }
  }
}
