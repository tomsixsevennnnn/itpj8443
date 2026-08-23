import { SettingsService } from './settings.service'

const makeService = () => {
  const prisma = { settings: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } } as any
  const audit = { log: jest.fn() } as any
  const uploads = { deleteManagedFile: jest.fn() } as any
  return { service: new SettingsService(prisma, audit, uploads), prisma, audit, uploads }
}

const BASE_ROW = { id: 1, shopLogo: '', promptPayQr: '', wageChef: 1200 }

describe('SettingsService', () => {
  it('get: isOwner=false ตัดฟิลด์ต้นทุนภายใน (ค่าแรง) ออกจาก response', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW })

    const result = await service.get(false)

    expect(result).not.toHaveProperty('wageChef')
  })

  it('get: isOwner=true คืนทุกฟิลด์รวมค่าแรง', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW })

    const result = await service.get(true)

    expect(result).toHaveProperty('wageChef', 1200)
  })

  it('get: ยังไม่เคยมีแถวใน DB — สร้างแถว default ให้อัตโนมัติ', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue(null)
    prisma.settings.create.mockResolvedValue({ ...BASE_ROW })

    await service.get(true)

    expect(prisma.settings.create).toHaveBeenCalled()
  })

  it('update: บันทึก audit log ด้วย before/after', async () => {
    const { service, prisma, audit } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopName: 'ใหม่' })

    await service.update({ shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(audit.log).toHaveBeenCalledWith(
      'auth0|owner',
      'settings.update',
      'Settings',
      '1',
      { ...BASE_ROW },
      { ...BASE_ROW, shopName: 'ใหม่' },
    )
  })

  it('update: เปลี่ยนโลโก้ร้าน — ลบไฟล์โลโก้เก่าทิ้ง', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/new.png' })

    await service.update({ shopLogo: '/uploads/logo/new.png' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/logo/old.png')
  })

  it('update: ไม่แตะโลโก้/QR เลย — ไม่ลบไฟล์ใดๆ', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png', shopName: 'ใหม่' })

    await service.update({ shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).not.toHaveBeenCalled()
  })
})
