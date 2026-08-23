import { Role } from '@prisma/client'
import { AuditService } from './audit.service'

const makeService = () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any
  return { service: new AuditService(prisma), prisma }
}

describe('AuditService', () => {
  it('log: บันทึกด้วย actorUserId/actorRole จาก DB ของ auth0Sub นั้น', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.OWNER })

    await service.log('auth0|1', 'menu.delete', 'MenuItem', 'm1', { name: 'เดิม' }, undefined)

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'u1',
        actorRole: Role.OWNER,
        action: 'menu.delete',
        entityType: 'MenuItem',
        entityId: 'm1',
        before: { name: 'เดิม' },
        after: undefined,
      },
    })
  })

  it('log: ไม่พบ user ใน DB — fallback actorUserId เป็น auth0Sub ตรงๆ, actorRole เป็น OWNER', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(null)

    await service.log('auth0|orphan', 'settings.update', 'Settings', '1')

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ actorUserId: 'auth0|orphan', actorRole: Role.OWNER }) }),
    )
  })

  it('log: เขียน DB ไม่สำเร็จ ต้องไม่ throw ออกไปบล็อกงานจริง', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockRejectedValue(new Error('db down'))

    await expect(service.log('auth0|1', 'menu.delete', 'MenuItem', 'm1')).resolves.toBeUndefined()
  })

  it('findPage: คำนวณ skip จาก page/pageSize แล้วคืน total', async () => {
    const { service, prisma } = makeService()
    prisma.auditLog.findMany.mockResolvedValue([{ id: 'a1' }])
    prisma.auditLog.count.mockResolvedValue(21)

    const result = await service.findPage(3, 10)

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10, orderBy: { createdAt: 'desc' } }),
    )
    expect(result).toEqual({ items: [{ id: 'a1' }], total: 21, page: 3, pageSize: 10 })
  })
})
