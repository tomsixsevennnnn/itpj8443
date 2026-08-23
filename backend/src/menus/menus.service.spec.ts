import { MenusService } from './menus.service'

const makeService = () => {
  const prisma = {
    menuItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  } as any
  const audit = { log: jest.fn() } as any
  const uploads = { deleteManagedFile: jest.fn() } as any
  return { service: new MenusService(prisma, audit, uploads), prisma, audit, uploads }
}

describe('MenusService', () => {
  it('create: บันทึก audit log พร้อม after = แถวที่สร้างใหม่', async () => {
    const { service, prisma, audit } = makeService()
    const created = { id: 'm1', name: 'เมนูใหม่' }
    prisma.menuItem.create.mockResolvedValue(created)

    const result = await service.create({ name: 'เมนูใหม่' } as any, 'auth0|owner')

    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'menu.create', 'MenuItem', 'm1', undefined, created)
    expect(result).toBe(created)
  })

  it('update: บันทึก audit log พร้อม before/after', async () => {
    const { service, prisma, audit } = makeService()
    const before = { id: 'm1', name: 'เดิม', image: null }
    const after = { id: 'm1', name: 'ใหม่', image: null }
    prisma.menuItem.findUnique.mockResolvedValue(before)
    prisma.menuItem.update.mockResolvedValue(after)

    await service.update('m1', { name: 'ใหม่' } as any, 'auth0|owner')

    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'menu.update', 'MenuItem', 'm1', before, after)
  })

  it('remove: บันทึก audit log พร้อม before = แถวที่ลบไป', async () => {
    const { service, prisma, audit } = makeService()
    const deleted = { id: 'm1', image: null }
    prisma.menuItem.delete.mockResolvedValue(deleted)

    const result = await service.remove('m1', 'auth0|owner')

    expect(prisma.menuItem.delete).toHaveBeenCalledWith({ where: { id: 'm1' } })
    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'menu.delete', 'MenuItem', 'm1', deleted, undefined)
    expect(result).toBe(deleted)
  })

  it('remove: ลบไฟล์รูปเก่าทิ้งถ้าเมนูที่ลบมีรูป', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.menuItem.delete.mockResolvedValue({ id: 'm1', image: '/uploads/menus/old.jpg' })

    await service.remove('m1', 'auth0|owner')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/menus/old.jpg')
  })

  it('update: เปลี่ยนรูปใหม่ — ลบไฟล์รูปเก่าทิ้ง', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.menuItem.findUnique.mockResolvedValue({ id: 'm1', image: '/uploads/menus/old.jpg' })
    prisma.menuItem.update.mockResolvedValue({ id: 'm1', image: '/uploads/menus/new.jpg' })

    await service.update('m1', { image: '/uploads/menus/new.jpg' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/menus/old.jpg')
  })

  it('update: ไม่แตะรูปเลย — ไม่ลบไฟล์ใดๆ', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.menuItem.findUnique.mockResolvedValue({ id: 'm1', image: '/uploads/menus/old.jpg' })
    prisma.menuItem.update.mockResolvedValue({ id: 'm1', image: '/uploads/menus/old.jpg' })

    await service.update('m1', { name: 'ชื่อใหม่' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).not.toHaveBeenCalled()
  })

  it('findAll: isOwner=false ไม่ส่ง page/limit — คืน array เต็ม และ select ไม่มี costPrice', async () => {
    const { service, prisma } = makeService()
    prisma.menuItem.findMany.mockResolvedValue([{ id: 'm1' }])

    const result = await service.findAll(false)

    const call = prisma.menuItem.findMany.mock.calls[0][0]
    expect(call.select).toBeDefined()
    expect(call.select.costPrice).toBeUndefined()
    expect(result).toEqual([{ id: 'm1' }])
  })

  it('findAll: isOwner=true ไม่ต้อง select แบบจำกัด — คืนทุกฟิลด์รวม costPrice', async () => {
    const { service, prisma } = makeService()
    prisma.menuItem.findMany.mockResolvedValue([{ id: 'm1', costPrice: 100 }])

    const result = await service.findAll(true)

    const call = prisma.menuItem.findMany.mock.calls[0][0]
    expect(call.select).toBeUndefined()
    expect(result).toEqual([{ id: 'm1', costPrice: 100 }])
  })
})
