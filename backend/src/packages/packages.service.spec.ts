import { BadRequestException } from '@nestjs/common'
import { PackagesService } from './packages.service'

const makeService = () => {
  const prisma = {
    package: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    packageCourse: { deleteMany: jest.fn(), createMany: jest.fn() },
    // count = จำนวนเมนูที่อยู่ในร้านจริง (ค่าเริ่มต้น 1 = เมนู m1 ที่เทสต์ส่วนใหญ่ใช้อยู่ในร้านนี้)
    menuItem: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(1) },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((fn: any) => (typeof fn === 'function' ? fn(prisma) : Promise.all(fn))),
  } as any
  const audit = { log: jest.fn() } as any
  return { service: new PackagesService(prisma, audit), prisma, audit }
}

const SHOP = 'shop1'

describe('PackagesService', () => {
  it('create: courses ว่าง — สร้างแพ็กเกจอย่างเดียวไม่ยิง createMany/join table/menuItem lookup', async () => {
    const { service, prisma, audit } = makeService()
    prisma.package.count.mockResolvedValue(0)
    const created = { id: 'p1', name: 'แพ็กเกจใหม่' }
    prisma.package.create.mockResolvedValue(created)

    const result = await service.create({ name: 'แพ็กเกจใหม่', courses: [] } as any, 'auth0|owner', SHOP)

    expect(prisma.package.create).toHaveBeenCalledTimes(1)
    expect(prisma.packageCourse.createMany).not.toHaveBeenCalled()
    expect(prisma.$executeRaw).not.toHaveBeenCalled()
    expect(prisma.menuItem.findMany).not.toHaveBeenCalled()
    expect(result).toEqual({ ...created, courses: [] })
    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'package.create', 'Package', 'p1', undefined, result, SHOP)
  })

  it('create: มี courses — createMany course ใหม่ + insert join table แบบ batch + ดึง MenuItem แบบขนานกับ transaction', async () => {
    const { service, prisma } = makeService()
    prisma.package.count.mockResolvedValue(0)
    const created = { id: 'p1', name: 'แพ็กเกจใหม่' }
    prisma.package.create.mockResolvedValue(created)
    const item = { id: 'm1', name: 'เมนู A' }
    prisma.menuItem.findMany.mockResolvedValue([item])

    const result = await service.create({ name: 'แพ็กเกจใหม่', courses: [{ no: 1, title: 'ของว่าง', category: 'snack', choose: 1, itemIds: ['m1'] }] } as any, 'auth0|owner', SHOP)

    expect(prisma.packageCourse.createMany).toHaveBeenCalledTimes(1)
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
    expect(prisma.menuItem.findMany).toHaveBeenCalledWith({ where: { id: { in: ['m1'] } } })
    expect(result.courses).toHaveLength(1)
    expect(result.courses[0].items).toEqual([item])
  })

  it('create: ใส่เมนูที่ไม่ได้อยู่ในร้านนี้ (เช่น id เมนูร้านอื่น) — ปฏิเสธ ไม่สร้างแพ็กเกจ', async () => {
    const { service, prisma } = makeService()
    prisma.package.count.mockResolvedValue(0)
    prisma.menuItem.count.mockResolvedValue(0) // เมนูที่ส่งมาไม่อยู่ในร้านนี้

    await expect(
      service.create({ name: 'x', courses: [{ no: 1, title: 'a', category: 'snack', choose: 1, itemIds: ['other-shop-menu'] }] } as any, 'auth0|owner', SHOP),
    ).rejects.toThrow(BadRequestException)
    expect(prisma.menuItem.count).toHaveBeenCalledWith({ where: { id: { in: ['other-shop-menu'] }, shopId: SHOP } })
    expect(prisma.package.create).not.toHaveBeenCalled()
  })

  it('addCourse: ใส่เมนูที่ไม่ได้อยู่ในร้านนี้ — ปฏิเสธ', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue({ id: 'p1', shopId: SHOP })
    prisma.menuItem.count.mockResolvedValue(0)
    ;(prisma.packageCourse as any).create = jest.fn()

    await expect(
      service.addCourse('p1', { no: 1, title: 'a', category: 'snack', choose: 1, itemIds: ['other-shop-menu'] } as any, SHOP),
    ).rejects.toThrow(BadRequestException)
    expect(prisma.packageCourse.create).not.toHaveBeenCalled()
  })

  it('update: บันทึก audit log พร้อม before/after (ไม่ส่ง courses มา)', async () => {
    const { service, prisma, audit } = makeService()
    const before = { id: 'p1', name: 'เดิม', shopId: SHOP }
    const after = { id: 'p1', name: 'ใหม่' }
    prisma.package.findUnique.mockResolvedValue(before)
    prisma.package.update.mockResolvedValue(after)

    await service.update(
      'p1',
      { name: 'ใหม่' } as any,
      'auth0|owner',
      SHOP,
    )

    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'package.update', 'Package', 'p1', before, after, SHOP)
  })

  it('update: ส่ง courses มาแต่เหมือนของเดิมทุกอย่าง — ข้าม delete+recreate ไปอัปเดตแค่ field ระดับบน', async () => {
    const { service, prisma, audit } = makeService()
    const before = {
      id: 'p1',
      name: 'เดิม',
      courses: [{ no: 1, title: 'ของว่าง', icon: null, category: 'snack', choose: 1, items: [{ id: 'm1' }] }],
      shopId: SHOP,
    }
    const after = { ...before, name: 'ใหม่' }
    prisma.package.findUnique.mockResolvedValue(before)
    prisma.package.update.mockResolvedValue(after)

    const result = await service.update(
      'p1',
      { name: 'ใหม่', courses: [{ no: 1, title: 'ของว่าง', category: 'snack', choose: 1, itemIds: ['m1'] }] } as any,
      'auth0|owner',
      SHOP,
    )

    expect(prisma.packageCourse.deleteMany).not.toHaveBeenCalled()
    expect(prisma.packageCourse.createMany).not.toHaveBeenCalled()
    expect(prisma.$executeRaw).not.toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'package.update', 'Package', 'p1', before, after, SHOP)
    expect(result).toBe(after)
  })

  it('update: ส่ง courses มาและเปลี่ยนจริง — ลบของเดิม, createMany course ใหม่ + insert join table แบบ batch + ดึง MenuItem แบบขนานกับ transaction', async () => {
    const { service, prisma, audit } = makeService()
    const before = { id: 'p1', name: 'เดิม', courses: [], shopId: SHOP }
    const updated = { id: 'p1', name: 'ใหม่' }
    const item = { id: 'm1', name: 'เมนู A' }
    prisma.package.findUnique.mockResolvedValue(before)
    prisma.package.update.mockResolvedValue(updated)
    prisma.menuItem.findMany.mockResolvedValue([item])

    const result = await service.update(
      'p1',
      { name: 'ใหม่', courses: [{ no: 1, title: 'ของว่าง', category: 'snack', choose: 1, itemIds: ['m1', 'm1'] }] } as any,
      'auth0|owner',
      SHOP,
    )

    expect(prisma.packageCourse.deleteMany).toHaveBeenCalledWith({ where: { packageId: 'p1' } })
    expect(prisma.packageCourse.createMany).toHaveBeenCalledTimes(1)
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
    expect(prisma.menuItem.findMany).toHaveBeenCalledWith({ where: { id: { in: ['m1'] } } })
    expect((result as any).courses[0].items).toEqual([item])
    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'package.update', 'Package', 'p1', before, result, SHOP)
  })

  it('remove: soft delete — update deletedAt แทนการลบแถวจริง แล้วบันทึก audit log พร้อม before/after', async () => {
    const { service, prisma, audit } = makeService()
    const before = { id: 'p1', name: 'แพ็กเกจ A', deletedAt: null, shopId: SHOP }
    const after = { id: 'p1', name: 'แพ็กเกจ A', deletedAt: new Date() }
    prisma.package.findUnique.mockResolvedValue(before)
    prisma.package.update.mockResolvedValue(after)

    const result = await service.remove('p1', 'auth0|owner', SHOP)

    expect(prisma.package.delete).not.toHaveBeenCalled()
    expect(prisma.package.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { deletedAt: expect.any(Date) } })
    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'package.delete', 'Package', 'p1', before, after, SHOP)
    expect(result).toBe(after)
  })

  it('remove: ไม่พบแพ็กเกจนี้ — โยน NotFoundException', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue(null)

    await expect(service.remove('missing', 'auth0|owner', SHOP)).rejects.toThrow('ไม่พบแพ็กเกจนี้')
  })

  it('reorder: ids ไม่ตรงกับแพ็กเกจทั้งหมดที่มีอยู่ (ขาด/เกิน) throw BadRequestException', async () => {
    const { service, prisma } = makeService()
    prisma.package.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])

    await expect(service.reorder({ ids: ['p1'] }, SHOP)).rejects.toThrow(BadRequestException)
  })

  it('reorder: ids ซ้ำกันเอง throw BadRequestException', async () => {
    const { service, prisma } = makeService()
    prisma.package.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])

    await expect(service.reorder({ ids: ['p1', 'p1'] }, SHOP)).rejects.toThrow(BadRequestException)
  })

  it('reorder: ids ครบตรงกันพอดี — อัปเดต sortOrder ตามลำดับใหม่', async () => {
    const { service, prisma } = makeService()
    prisma.package.findMany.mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }]).mockResolvedValueOnce([])

    await service.reorder({ ids: ['p2', 'p1'] }, SHOP)

    expect(prisma.package.update).toHaveBeenCalledWith({ where: { id: 'p2' }, data: { sortOrder: 0 } })
    expect(prisma.package.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { sortOrder: 1 } })
  })
})
