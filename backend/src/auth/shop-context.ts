import { Role } from '@prisma/client'
import type { PrismaService } from '../prisma/prisma.service'

/** ตัวตน + บทบาท "ในร้านที่กำลังใช้งานอยู่" ของผู้เรียก — ใช้ตัดสินว่าแก้/ดูข้อมูลร้านไหนได้บ้าง */
export interface ShopContext {
  id: string
  role: Role
  shopId: string | null
}

/**
 * resolve บทบาทของผู้ใช้ในร้านที่ request นี้ทำงานอยู่ (จาก header X-Shop-Id ที่ frontend ส่งมา = ร้านที่เปิดอยู่ตอนนี้)
 *  - SUPER_ADMIN → SUPER_ADMIN เสมอ ไม่ผูกร้าน
 *  - มี ShopMember ของร้านนั้น → OWNER ของร้านนั้น (shopId = ร้านนั้น)
 *  - ไม่มี ShopMember ของร้านนั้น → CUSTOMER (ใช้ร้านนั้นในฐานะลูกค้า แม้จะเป็น owner ของร้านอื่นอยู่ก็ตาม)
 *  - ไม่ส่ง header มา → ใช้ร้านแรกที่เป็น owner (เก่าสุด) ถ้ามี ไม่มีเลย = CUSTOMER
 * header ปลอมไม่ได้ผล: สิทธิ์ owner มาจากแถว ShopMember ใน DB เท่านั้น header แค่เลือกว่าจะดูร้านไหนใน "ร้านที่มีสิทธิ์อยู่แล้ว"
 */
export async function resolveShopContext(
  prisma: Pick<PrismaService, 'user'>,
  auth0Sub: string,
  requestedShopId?: string | null,
): Promise<ShopContext | null> {
  const user = await prisma.user.findUnique({
    where: { auth0Sub },
    select: { id: true, role: true, memberships: { select: { shopId: true }, orderBy: { createdAt: 'asc' } } },
  })
  if (!user) return null
  if (user.role === Role.SUPER_ADMIN) return { id: user.id, role: Role.SUPER_ADMIN, shopId: null }

  const member = requestedShopId ? user.memberships.find((m) => m.shopId === requestedShopId) : user.memberships[0]
  if (member) return { id: user.id, role: Role.OWNER, shopId: member.shopId }
  return { id: user.id, role: Role.CUSTOMER, shopId: null }
}
