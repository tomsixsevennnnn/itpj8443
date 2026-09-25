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
  const uploads = { deleteManagedFile: jest.fn(), makeThumbnailDataUrl: jest.fn().mockResolvedValue(null) } as any
  return { service: new MenusService(prisma, audit, uploads), prisma, audit, uploads }
}

const SHOP = 'shop1'

describe('MenusService', () => {
  it('create: บันทึก audit log พร้อม after = แถวที่สร้างใหม่', async () => {
    const { service, prisma, audit } = makeService()
    const created = { id: 'm1', name: 'เมนูใหม่', shopId: SHOP }
    prisma.menuItem.create.mockResolvedValue(created)

    const result = await service.create({ name: 'เมนูใหม่' } as any, 'auth0|owner', SHOP)

    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'menu.create', 'MenuItem', 'm1', undefined, created, SHOP)
    expect(result).toBe(created)
  })

  it('create: imagePosition ถูก spread เป็น plain object ก่อนส่งเข้า Prisma', async () => {
    const { service, prisma } = makeService()
    prisma.menuItem.create.mockResolvedValue({ id: 'm1' })
    const imagePosition = { x: 20, y: 30 }

    await service.create({ name: 'เมนูใหม่', image: '/uploads/menus/a.jpg', imagePosition, imageScale: 1.5 } as any, 'auth0|owner', SHOP)

    const call = prisma.menuItem.create.mock.calls[0][0]
    expect(call.data.imagePosition).toEqual({ x: 20, y: 30 })
    expect(call.data.imagePosition).not.toBe(imagePosition)
    expect(call.data.imageScale).toBe(1.5)
    expect(call.data.shopId).toBe(SHOP)
  })

  it('update: บันทึก audit log พร้อม before/after', async () => {
    const { service, prisma, audit } = makeService()
    const before = { id: 'm1', name: 'เดิม', image: null, shopId: SHOP }
    const after = { id: 'm1', name: 'ใหม่', image: null, shopId: SHOP }
    prisma.menuItem.findUnique.mockResolvedValue(before)
    prisma.menuItem.update.mockResolvedValue(after)

    await service.update('m1', { name: 'ใหม่' } as any, 'auth0|owner', SHOP)

    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'menu.update', 'MenuItem', 'm1', before, after, SHOP)
  })

  it('update: เมนูเป็นของร้านอื่น — โยน NotFoundException กันแก้ข้ามร้าน', async () => {
    const { service, prisma } = makeService()
    prisma.menuItem.findUnique.mockResolvedValue({ id: 'm1', shopId: 'other-shop' })

    await expect(service.update('m1', { name: 'ใหม่' } as any, 'auth0|owner', SHOP)).rejects.toThrow('ไม่พบเมนูนี้')
    expect(prisma.menuItem.update).not.toHaveBeenCalled()
  })

  it('remove: soft delete — update deletedAt แทนการลบแถวจริง แล้วบันทึก audit log พร้อม before/after', async () => {
    const { service, prisma, audit } = makeService()
    const before = { id: 'm1', image: null, deletedAt: null, shopId: SHOP }
    const after = { id: 'm1', image: null, deletedAt: new Date(), shopId: SHOP }
    prisma.menuItem.findUnique.mockResolvedValue(before)
    prisma.menuItem.update.mockResolvedValue(after)

    const result = await service.remove('m1', 'auth0|owner', SHOP)

    expect(prisma.menuItem.delete).not.toHaveBeenCalled()
    expect(prisma.menuItem.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { deletedAt: expect.any(Date) } })
    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'menu.delete', 'MenuItem', 'm1', before, after, SHOP)
    expect(result).toBe(after)
  })

  it('remove: ไม่พบเมนูนี้ — โยน NotFoundException', async () => {
    const { service, prisma } = makeService()
    prisma.menuItem.findUnique.mockResolvedValue(null)

    await expect(service.remove('missing', 'auth0|owner', SHOP)).rejects.toThrow('ไม่พบเมนูนี้')
  })

  it('remove: soft delete ไม่ลบไฟล์รูปทิ้ง (แถวยังอยู่จริง อาจถูกแพ็กเกจเก่าอ้างถึง)', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.menuItem.findUnique.mockResolvedValue({ id: 'm1', image: '/uploads/menus/old.jpg', deletedAt: null, shopId: SHOP })
    prisma.menuItem.update.mockResolvedValue({ id: 'm1', image: '/uploads/menus/old.jpg', deletedAt: new Date() })

    await service.remove('m1', 'auth0|owner', SHOP)

    expect(uploads.deleteManagedFile).not.toHaveBeenCalled()
  })

  it('update: เปลี่ยนรูปใหม่ — ลบไฟล์รูปเก่าทิ้ง', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.menuItem.findUnique.mockResolvedValue({ id: 'm1', image: '/uploads/menus/old.jpg', shopId: SHOP })
    prisma.menuItem.update.mockResolvedValue({ id: 'm1', image: '/uploads/menus/new.jpg' })

    await service.update('m1', { image: '/uploads/menus/new.jpg' } as any, 'auth0|owner', SHOP)

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/menus/old.jpg')
  })

  it('update: เปลี่ยนรูปใหม่ — ย่อรูปเก่าเป็น thumbnail ฝังใน audit log ก่อนค่อยลบไฟล์จริงทิ้ง', async () => {
    const { service, prisma, audit, uploads } = makeService()
    const before = { id: 'm1', name: 'เมนู A', image: '/uploads/menus/old.jpg', shopId: SHOP }
    const after = { id: 'm1', name: 'เมนู A', image: '/uploads/menus/new.jpg' }
    prisma.menuItem.findUnique.mockResolvedValue(before)
    prisma.menuItem.update.mockResolvedValue(after)
    uploads.makeThumbnailDataUrl.mockResolvedValue('data:image/jpeg;base64,thumb')

    const callOrder: string[] = []
    uploads.makeThumbnailDataUrl.mockImplementation(async () => {
      callOrder.push('thumbnail')
      return 'data:image/jpeg;base64,thumb'
    })
    uploads.deleteManagedFile.mockImplementation(async () => {
      callOrder.push('delete')
    })

    await service.update('m1', { image: '/uploads/menus/new.jpg' } as any, 'auth0|owner', SHOP)

    expect(uploads.makeThumbnailDataUrl).toHaveBeenCalledWith('/uploads/menus/old.jpg')
    expect(audit.log).toHaveBeenCalledWith(
      'auth0|owner',
      'menu.update',
      'MenuItem',
      'm1',
      { ...before, image: 'data:image/jpeg;base64,thumb' },
      after,
      SHOP,
    )
    // ต้องย่อ thumbnail (ต้องอ่านไฟล์ได้) ก่อนค่อยลบไฟล์จริงทิ้งเสมอ ไม่งั้นไฟล์หายก่อนอ่าน
    expect(callOrder).toEqual(['thumbnail', 'delete'])
  })

  it('update: ย่อ thumbnail ไม่สำเร็จ — ยัง log path เดิมไว้ (ดีกว่าทำรายการไม่สำเร็จทั้งอัน) และลบไฟล์เก่าตามปกติ', async () => {
    const { service, prisma, audit, uploads } = makeService()
    const before = { id: 'm1', name: 'เมนู A', image: '/uploads/menus/old.jpg', shopId: SHOP }
    const after = { id: 'm1', name: 'เมนู A', image: '/uploads/menus/new.jpg' }
    prisma.menuItem.findUnique.mockResolvedValue(before)
    prisma.menuItem.update.mockResolvedValue(after)
    uploads.makeThumbnailDataUrl.mockResolvedValue(null)

    await service.update('m1', { image: '/uploads/menus/new.jpg' } as any, 'auth0|owner', SHOP)

    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'menu.update', 'MenuItem', 'm1', before, after, SHOP)
    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/menus/old.jpg')
  })

  it('update: ไม่แตะรูปเลย — ไม่ลบไฟล์ใดๆ', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.menuItem.findUnique.mockResolvedValue({ id: 'm1', image: '/uploads/menus/old.jpg', shopId: SHOP })
    prisma.menuItem.update.mockResolvedValue({ id: 'm1', image: '/uploads/menus/old.jpg' })

    await service.update('m1', { name: 'ชื่อใหม่' } as any, 'auth0|owner', SHOP)

    expect(uploads.deleteManagedFile).not.toHaveBeenCalled()
  })

  it('findAll: isOwner=false ไม่ส่ง page/limit — คืน array เต็ม, select ไม่มี costPrice, กรองตาม shopId', async () => {
    const { service, prisma } = makeService()
    prisma.menuItem.findMany.mockResolvedValue([{ id: 'm1' }])

    const result = await service.findAll(SHOP, false)

    const call = prisma.menuItem.findMany.mock.calls[0][0]
    expect(call.where).toEqual({ shopId: SHOP, deletedAt: null })
    expect(call.select).toBeDefined()
    expect(call.select.costPrice).toBeUndefined()
    expect(result).toEqual([{ id: 'm1' }])
  })

  it('findAll: isOwner=true ไม่ต้อง select แบบจำกัด — คืนทุกฟิลด์รวม costPrice', async () => {
    const { service, prisma } = makeService()
    prisma.menuItem.findMany.mockResolvedValue([{ id: 'm1', costPrice: 100 }])

    const result = await service.findAll(SHOP, true)

    const call = prisma.menuItem.findMany.mock.calls[0][0]
    expect(call.select).toBeUndefined()
    expect(result).toEqual([{ id: 'm1', costPrice: 100 }])
  })
})
