import { BadRequestException } from '@nestjs/common'
import { PackagesService } from './packages.service'

const makeService = () => {
  const prisma = {
    package: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn((fn: any) => (typeof fn === 'function' ? fn(prisma) : Promise.all(fn))),
  } as any
  const audit = { log: jest.fn() } as any
  return { service: new PackagesService(prisma, audit), prisma, audit }
}

describe('PackagesService', () => {
  it('create: บันทึก audit log พร้อม after = แพ็กเกจที่สร้างใหม่', async () => {
    const { service, prisma, audit } = makeService()
    prisma.package.count.mockResolvedValue(0)
    const created = { id: 'p1', name: 'แพ็กเกจใหม่' }
    prisma.package.create.mockResolvedValue(created)

    const result = await service.create({ name: 'แพ็กเกจใหม่', courses: [] } as any, 'auth0|owner')

    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'package.create', 'Package', 'p1', undefined, created)
    expect(result).toBe(created)
  })

  it('update: บันทึก audit log พร้อม before/after (ไม่ส่ง courses มา)', async () => {
    const { service, prisma, audit } = makeService()
    const before = { id: 'p1', name: 'เดิม' }
    const after = { id: 'p1', name: 'ใหม่' }
    prisma.package.findUnique.mockResolvedValue(before)
    prisma.package.update.mockResolvedValue(after)

    await service.update('p1', { name: 'ใหม่' } as any, 'auth0|owner')

    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'package.update', 'Package', 'p1', before, after)
  })

  it('remove: บันทึก audit log พร้อม before = แพ็กเกจที่ลบไป', async () => {
    const { service, prisma, audit } = makeService()
    const deleted = { id: 'p1', name: 'แพ็กเกจ A' }
    prisma.package.delete.mockResolvedValue(deleted)

    const result = await service.remove('p1', 'auth0|owner')

    expect(prisma.package.delete).toHaveBeenCalledWith({ where: { id: 'p1' } })
    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'package.delete', 'Package', 'p1', deleted, undefined)
    expect(result).toBe(deleted)
  })

  it('reorder: ids ไม่ตรงกับแพ็กเกจทั้งหมดที่มีอยู่ (ขาด/เกิน) throw BadRequestException', async () => {
    const { service, prisma } = makeService()
    prisma.package.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])

    await expect(service.reorder({ ids: ['p1'] })).rejects.toThrow(BadRequestException)
  })

  it('reorder: ids ซ้ำกันเอง throw BadRequestException', async () => {
    const { service, prisma } = makeService()
    prisma.package.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])

    await expect(service.reorder({ ids: ['p1', 'p1'] })).rejects.toThrow(BadRequestException)
  })

  it('reorder: ids ครบตรงกันพอดี — อัปเดต sortOrder ตามลำดับใหม่', async () => {
    const { service, prisma } = makeService()
    prisma.package.findMany.mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }]).mockResolvedValueOnce([])

    await service.reorder({ ids: ['p2', 'p1'] })

    expect(prisma.package.update).toHaveBeenCalledWith({ where: { id: 'p2' }, data: { sortOrder: 0 } })
    expect(prisma.package.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { sortOrder: 1 } })
  })
})
