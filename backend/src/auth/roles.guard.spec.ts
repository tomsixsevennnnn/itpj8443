import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prisma/client'
import { RolesGuard } from './roles.guard'

const makeContext = (sub: string | undefined, requestedShopId?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: sub ? { sub, requestedShopId } : undefined }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext

/** dbRole = Role ระดับระบบของ User (CUSTOMER/SUPER_ADMIN), ownedShopIds = ร้านที่เป็น owner (ShopMember) */
const makeGuard = (required: string[] | undefined, dbRole: Role | null, ownedShopIds: string[] = []) => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector
  const user = dbRole ? { id: 'u1', role: dbRole, memberships: ownedShopIds.map((shopId) => ({ shopId })) } : null
  const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } } as any
  return new RolesGuard(reflector, prisma)
}

describe('RolesGuard', () => {
  it('อนุญาตผ่านถ้า endpoint ไม่ได้ระบุ @Roles ไว้', async () => {
    const guard = makeGuard(undefined, null)
    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true)
  })

  it('อนุญาต owner เข้า endpoint ที่ต้องการ owner (เช็คจาก DB ไม่ใช่ JWT claim)', async () => {
    const guard = makeGuard(['owner'], Role.CUSTOMER, ['shop1'])
    await expect(guard.canActivate(makeContext('auth0|1', 'shop1'))).resolves.toBe(true)
  })

  it('บล็อก customer ไม่ให้เข้า endpoint ที่ต้องการ owner', async () => {
    const guard = makeGuard(['owner'], Role.CUSTOMER)
    await expect(guard.canActivate(makeContext('auth0|1'))).rejects.toThrow(ForbiddenException)
  })

  it('ไม่พบ user ใน DB เลย = ถือเป็น customer โดย default (ไม่ใช่ owner)', async () => {
    const guard = makeGuard(['owner'], null)
    await expect(guard.canActivate(makeContext('auth0|1'))).rejects.toThrow(ForbiddenException)
  })

  it('อนุญาต customer เข้า endpoint ที่ต้องการ customer', async () => {
    const guard = makeGuard(['customer'], Role.CUSTOMER)
    await expect(guard.canActivate(makeContext('auth0|1'))).resolves.toBe(true)
  })

  it('ถูก demote ไปแล้ว (DB เปลี่ยนเป็น customer) แม้ access token เก่าจะยังอ้าง owner อยู่ ก็เข้า endpoint owner ไม่ได้', async () => {
    const guard = makeGuard(['owner'], Role.CUSTOMER)
    await expect(guard.canActivate(makeContext('auth0|1'))).rejects.toThrow(ForbiddenException)
  })

  it('owner ร้าน 2 เปิดร้าน 1 (ไม่ใช่ owner ร้านนั้น) = เป็น customer — เข้า endpoint owner ไม่ได้ แต่เข้า endpoint customer ได้', async () => {
    const ownerEndpoint = makeGuard(['owner'], Role.CUSTOMER, ['shop2'])
    await expect(ownerEndpoint.canActivate(makeContext('auth0|1', 'shop1'))).rejects.toThrow(ForbiddenException)

    const customerEndpoint = makeGuard(['customer'], Role.CUSTOMER, ['shop2'])
    await expect(customerEndpoint.canActivate(makeContext('auth0|1', 'shop1'))).resolves.toBe(true)
  })

  it('owner ร้าน 2 เปิดร้าน 2 = เป็น owner — เข้า endpoint customer ไม่ได้', async () => {
    const guard = makeGuard(['customer'], Role.CUSTOMER, ['shop2'])
    await expect(guard.canActivate(makeContext('auth0|1', 'shop2'))).rejects.toThrow(ForbiddenException)
  })

  it('ไม่ส่ง X-Shop-Id มา — ใช้ร้านแรกที่เป็น owner (owner ที่ session ค้างโดยไม่ได้เลือกร้าน)', async () => {
    const guard = makeGuard(['owner'], Role.CUSTOMER, ['shop2'])
    await expect(guard.canActivate(makeContext('auth0|1'))).resolves.toBe(true)
  })

  it('super admin เข้า endpoint super_admin ได้ไม่ว่าร้านไหน', async () => {
    const guard = makeGuard(['super_admin'], Role.SUPER_ADMIN)
    await expect(guard.canActivate(makeContext('auth0|1', 'shop1'))).resolves.toBe(true)
  })
})
