import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prisma/client'
import { RolesGuard } from './roles.guard'

const makeContext = (sub: string | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: sub ? { sub } : undefined }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext

const makeGuard = (required: string[] | undefined, dbRole: Role | null) => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector
  const prisma = { user: { findUnique: jest.fn().mockResolvedValue(dbRole ? { role: dbRole } : null) } } as any
  return new RolesGuard(reflector, prisma)
}

describe('RolesGuard', () => {
  it('อนุญาตผ่านถ้า endpoint ไม่ได้ระบุ @Roles ไว้', async () => {
    const guard = makeGuard(undefined, null)
    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true)
  })

  it('อนุญาต owner เข้า endpoint ที่ต้องการ owner (เช็คจาก DB ไม่ใช่ JWT claim)', async () => {
    const guard = makeGuard(['owner'], Role.OWNER)
    await expect(guard.canActivate(makeContext('auth0|1'))).resolves.toBe(true)
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
})
