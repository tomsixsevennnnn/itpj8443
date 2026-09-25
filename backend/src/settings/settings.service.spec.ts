import { ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { SettingsService } from './settings.service'

const makeService = () => {
  const prisma = { settings: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } } as any
  const audit = { log: jest.fn() } as any
  const uploads = { deleteManagedFile: jest.fn(), makeThumbnailDataUrl: jest.fn().mockResolvedValue(null) } as any
  return { service: new SettingsService(prisma, audit, uploads), prisma, audit, uploads }
}

const BASE_ROW = { id: 1, shopLogo: '', promptPayQr: '', wageChef: 1200 }

describe('SettingsService', () => {
  it('get: isOwner=false ตัดฟิลด์ต้นทุนภายใน (ค่าแรง) ออกจาก response', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW })

    const result = await service.get('shop1', false)

    expect(result).not.toHaveProperty('wageChef')
  })

  it('get: isOwner=true คืนทุกฟิลด์รวมค่าแรง', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW })

    const result = await service.get('shop1', true)

    expect(result).toHaveProperty('wageChef', 1200)
  })

  it('get: ยังไม่เคยมีแถวใน DB — สร้างแถว default ให้อัตโนมัติ', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue(null)
    prisma.settings.create.mockResolvedValue({ ...BASE_ROW })

    await service.get('shop1', true)

    expect(prisma.settings.create).toHaveBeenCalled()
  })

  it('update: บันทึก audit log ด้วย before/after', async () => {
    const { service, prisma, audit } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopName: 'ใหม่' })

    await service.update('shop1', { shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(audit.log).toHaveBeenCalledWith(
      'auth0|owner',
      'settings.update',
      'Settings',
      '1',
      { ...BASE_ROW },
      { ...BASE_ROW, shopName: 'ใหม่' },
      'shop1',
    )
  })

  it('update: ส่ง expectedVersion เป็นเงื่อนไข where แบบ compound key และ increment version ให้', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, version: 3 })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopName: 'ใหม่', version: 4 })

    await service.update('shop1', { shopName: 'ใหม่', expectedVersion: 3 } as any, 'auth0|owner')

    expect(prisma.settings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_version: { id: 1, version: 3 } },
        data: expect.objectContaining({ shopName: 'ใหม่', version: { increment: 1 } }),
      }),
    )
  })

  it('update: version ไม่ตรง (มีคนแก้ไปแล้ว) — โยน ConflictException แทนที่จะบันทึกทับเงียบๆ', async () => {
    const { service, prisma, audit } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, version: 3 })
    prisma.settings.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('No record found', { code: 'P2025', clientVersion: '6.19.3' }),
    )

    await expect(service.update('shop1', { shopName: 'ใหม่', expectedVersion: 1 } as any, 'auth0|owner')).rejects.toThrow(
      ConflictException,
    )
    expect(audit.log).not.toHaveBeenCalled()
  })

  it('update: เปลี่ยนโลโก้ร้าน — ลบไฟล์โลโก้เก่าทิ้ง', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/new.png' })

    await service.update('shop1', { shopLogo: '/uploads/logo/new.png' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/logo/old.png')
  })

  it('update: ไม่แตะโลโก้/QR เลย — ไม่ลบไฟล์ใดๆ', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png', shopName: 'ใหม่' })

    await service.update('shop1', { shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).not.toHaveBeenCalled()
  })

  it('update: เปลี่ยนโลโก้ร้าน — ย่อโลโก้เก่าเป็น thumbnail ฝังใน audit log ก่อนค่อยลบไฟล์จริงทิ้ง', async () => {
    const { service, prisma, audit, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/new.png' })
    uploads.makeThumbnailDataUrl.mockResolvedValue('data:image/jpeg;base64,thumb')

    await service.update('shop1', { shopLogo: '/uploads/logo/new.png' } as any, 'auth0|owner')

    expect(uploads.makeThumbnailDataUrl).toHaveBeenCalledWith('/uploads/logo/old.png')
    expect(audit.log).toHaveBeenCalledWith(
      'auth0|owner',
      'settings.update',
      'Settings',
      '1',
      { ...BASE_ROW, shopLogo: 'data:image/jpeg;base64,thumb' },
      { ...BASE_ROW, shopLogo: '/uploads/logo/new.png' },
      'shop1',
    )
  })

  it('update: เปลี่ยนรูป Hero — ลบไฟล์ Hero เก่าทิ้ง', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, homeContent: { heroImage: '/uploads/content/old-hero.jpg', gallery: [] } })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, homeContent: { heroImage: '/uploads/content/new-hero.jpg', gallery: [] } })

    await service.update('shop1', { homeContent: { heroImage: '/uploads/content/new-hero.jpg', gallery: [] } } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/content/old-hero.jpg')
    expect(uploads.deleteManagedFile).toHaveBeenCalledTimes(1)
  })

  it('update: ตัดรูปออกจากแกลเลอรี — ลบเฉพาะไฟล์ที่ถูกตัดออก ไม่แตะรูปที่ยังอยู่', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({
      ...BASE_ROW,
      homeContent: { heroImage: '', gallery: ['/uploads/content/a.jpg', '/uploads/content/b.jpg'] },
    })
    prisma.settings.update.mockResolvedValue({
      ...BASE_ROW,
      homeContent: { heroImage: '', gallery: ['/uploads/content/a.jpg'] },
    })

    await service.update('shop1', { homeContent: { heroImage: '', gallery: ['/uploads/content/a.jpg'] } } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/content/b.jpg')
    expect(uploads.deleteManagedFile).not.toHaveBeenCalledWith('/uploads/content/a.jpg')
    expect(uploads.deleteManagedFile).toHaveBeenCalledTimes(1)
  })

  it('update: ไม่ได้ส่ง homeContent มาเลย — ไม่ยุ่งกับไฟล์ Hero/แกลเลอรีเดิม', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({
      ...BASE_ROW,
      homeContent: { heroImage: '/uploads/content/old-hero.jpg', gallery: ['/uploads/content/a.jpg'] },
    })
    prisma.settings.update.mockResolvedValue({
      ...BASE_ROW,
      shopName: 'ใหม่',
      homeContent: { heroImage: '/uploads/content/old-hero.jpg', gallery: ['/uploads/content/a.jpg'] },
    })

    await service.update('shop1', { shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).not.toHaveBeenCalled()
  })
})
