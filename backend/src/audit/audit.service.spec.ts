import { Role } from '@prisma/client'
import { AuditService } from './audit.service'

const makeService = () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any
  const realtime = { emitAppChanged: jest.fn() } as any
  return { service: new AuditService(prisma, realtime), prisma, realtime }
}

describe('AuditService', () => {
  it('log: บันทึกด้วย actorUserId/actorRole/actorEmail จาก DB ของ auth0Sub นั้น', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.OWNER, email: 'owner@shop.com' })

    await service.log('auth0|1', 'menu.delete', 'MenuItem', 'm1', { name: 'เดิม' }, undefined)

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'u1',
        actorRole: Role.OWNER,
        actorEmail: 'owner@shop.com',
        action: 'menu.delete',
        entityType: 'MenuItem',
        entityId: 'm1',
        before: { name: 'เดิม' },
        after: undefined,
      },
    })
  })

  it('log: ไม่พบ user ใน DB — fallback actorUserId เป็น auth0Sub ตรงๆ, actorRole เป็น OWNER, actorEmail ว่าง', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(null)

    await service.log('auth0|orphan', 'settings.update', 'Settings', '1')

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actorUserId: 'auth0|orphan', actorRole: Role.OWNER, actorEmail: '' }),
      }),
    )
  })

  it('log: เขียน DB ไม่สำเร็จ ต้องไม่ throw ออกไปบล็อกงานจริง', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockRejectedValue(new Error('db down'))

    await expect(service.log('auth0|1', 'menu.delete', 'MenuItem', 'm1')).resolves.toBeUndefined()
  })

  it('findPage: คำนวณ skip จาก page/pageSize แล้วคืน total (shopId=null = ดูข้ามทุกร้าน)', async () => {
    const { service, prisma } = makeService()
    prisma.auditLog.findMany.mockResolvedValue([{ id: 'a1' }])
    prisma.auditLog.count.mockResolvedValue(21)

    const result = await service.findPage(3, 10, null)

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 20, take: 10, orderBy: { createdAt: 'desc' } }),
    )
    expect(result).toEqual({ items: [{ id: 'a1' }], total: 21, page: 3, pageSize: 10 })
  })

  it('findPage: shopId ระบุมา — กรองเฉพาะร้านนั้น', async () => {
    const { service, prisma } = makeService()
    prisma.auditLog.findMany.mockResolvedValue([])
    prisma.auditLog.count.mockResolvedValue(0)

    await service.findPage(1, 10, 'shop1')

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { shopId: 'shop1' } }))
    expect(prisma.auditLog.count).toHaveBeenCalledWith({ where: { shopId: 'shop1' } })
  })
})
