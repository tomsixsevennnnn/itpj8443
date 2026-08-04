import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AUTH0_ROLE_CLAIM } from './auth.constants'
import { RolesGuard } from './roles.guard'

const makeContext = (user: Record<string, unknown> | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext

const makeGuard = (required: string[] | undefined) => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector
  return new RolesGuard(reflector)
}

describe('RolesGuard', () => {
  it('อนุญาตผ่านถ้า endpoint ไม่ได้ระบุ @Roles ไว้', () => {
    const guard = makeGuard(undefined)
    expect(guard.canActivate(makeContext(undefined))).toBe(true)
  })

  it('อนุญาต owner เข้า endpoint ที่ต้องการ owner', () => {
    const guard = makeGuard(['owner'])
    const context = makeContext({ [AUTH0_ROLE_CLAIM]: 'owner' })
    expect(guard.canActivate(context)).toBe(true)
  })

  it('บล็อก customer ไม่ให้เข้า endpoint ที่ต้องการ owner', () => {
    const guard = makeGuard(['owner'])
    const context = makeContext({ [AUTH0_ROLE_CLAIM]: 'customer' })
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('ไม่มี claim role เลย = ถือเป็น customer โดย default (ไม่ใช่ owner)', () => {
    const guard = makeGuard(['owner'])
    const context = makeContext({})
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('อนุญาต customer เข้า endpoint ที่ต้องการ customer', () => {
    const guard = makeGuard(['customer'])
    const context = makeContext({ [AUTH0_ROLE_CLAIM]: 'customer' })
    expect(guard.canActivate(context)).toBe(true)
  })
})
