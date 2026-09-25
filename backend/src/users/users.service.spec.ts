import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Role } from '@prisma/client'
import { UsersService } from './users.service'

const makeService = () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as any
  const audit = { log: jest.fn() } as any
  return { service: new UsersService(prisma, audit), prisma, audit }
}

const OWNER_EDITOR = { id: 'editor1', role: Role.OWNER, shopId: 'shop1' }
const SUPER_ADMIN_EDITOR = { id: 'sa1', role: Role.SUPER_ADMIN, shopId: null }

describe('UsersService', () => {
  it('setRole: ป้องกันไม่ให้ owner คนสุดท้ายของร้านถูก demote เป็น customer', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.OWNER, shopId: 'shop1' })
    prisma.user.count.mockResolvedValue(1)

    await expect(service.setRole('u1', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)).rejects.toThrow(BadRequestException)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('setRole: demote ได้ถ้ายังมี owner คนอื่นเหลืออยู่ในร้านเดียวกัน', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.OWNER, shopId: 'shop1' })
    prisma.user.count.mockResolvedValue(2)
    prisma.user.update.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })

    await expect(service.setRole('u1', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)).resolves.toEqual({ id: 'u1', role: Role.CUSTOMER })
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: Role.OWNER, shopId: 'shop1' } })
  })

  it('setRole: owner promote customer เป็น owner — ผูก shopId ของตัวเองให้อัตโนมัติ', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER, shopId: null })
    prisma.user.update.mockResolvedValue({ id: 'u1', role: Role.OWNER, shopId: 'shop1' })

    await expect(service.setRole('u1', Role.OWNER, 'auth0|editor', OWNER_EDITOR)).resolves.toEqual({ id: 'u1', role: Role.OWNER, shopId: 'shop1' })
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { role: Role.OWNER, shopId: 'shop1' } })
    expect(prisma.user.count).not.toHaveBeenCalled()
  })

  it('setRole: owner แก้ owner ร้านอื่นไม่ได้', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.OWNER, shopId: 'shop2' })

    await expect(service.setRole('u1', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)).rejects.toThrow(BadRequestException)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('setRole: owner แตะบัญชี super admin ไม่ได้', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.SUPER_ADMIN, shopId: null })

    await expect(service.setRole('u1', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)).rejects.toThrow(BadRequestException)
  })

  it('setRole: super admin ตั้งใครเป็น OWNER ผ่าน endpoint นี้ตรงๆ ไม่ได้ (ต้องผ่านหน้าจัดการร้าน)', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER, shopId: null })

    await expect(service.setRole('u1', Role.OWNER, 'auth0|sa', SUPER_ADMIN_EDITOR)).rejects.toThrow(BadRequestException)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('setRole: super admin เลื่อน customer เป็น super admin ได้ปกติ', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER, shopId: null })
    prisma.user.update.mockResolvedValue({ id: 'u1', role: Role.SUPER_ADMIN })

    await expect(service.setRole('u1', Role.SUPER_ADMIN, 'auth0|sa', SUPER_ADMIN_EDITOR)).resolves.toEqual({ id: 'u1', role: Role.SUPER_ADMIN })
  })

  it('setRole: ไม่พบ user เลย throw NotFoundException', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(service.setRole('missing', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)).rejects.toThrow(NotFoundException)
  })

  it('setRole: บันทึก audit log พร้อม role เดิม/ใหม่ และ shopId ของผู้แก้ไข', async () => {
    const { service, prisma, audit } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER, shopId: null })
    prisma.user.update.mockResolvedValue({ id: 'u1', role: Role.OWNER })

    await service.setRole('u1', Role.OWNER, 'auth0|editor', OWNER_EDITOR)

    expect(audit.log).toHaveBeenCalledWith(
      'auth0|editor',
      'user.setRole',
      'User',
      'u1',
      { role: Role.CUSTOMER },
      { role: Role.OWNER },
      'shop1',
    )
  })

  it('isOwner: true เมื่อ role ใน DB เป็น OWNER', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ role: Role.OWNER })
    await expect(service.isOwner('auth0|1')).resolves.toBe(true)
  })

  it('isOwner: false เมื่อไม่พบ user ใน DB', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(null)
    await expect(service.isOwner('auth0|1')).resolves.toBe(false)
  })

  it('findOrCreate: มี user อยู่แล้ว — คืนของเดิม ไม่สร้างซ้ำ', async () => {
    const { service, prisma } = makeService()
    const existing = { id: 'u1', auth0Sub: 'auth0|1' }
    prisma.user.findUnique.mockResolvedValue(existing)

    const result = await service.findOrCreate({ auth0Sub: 'auth0|1', role: Role.CUSTOMER, name: 'A', email: 'a@a.com' })

    expect(result).toBe(existing)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('syncProfile: ยังไม่มี user เลย — สร้างใหม่ด้วยชื่อจาก Auth0', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({ id: 'u1' })

    await service.syncProfile('auth0|1', Role.CUSTOMER, { name: 'Google', surname: 'Name', email: 'a@a.com' })

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { auth0Sub: 'auth0|1', role: Role.CUSTOMER, name: 'Google', surname: 'Name', email: 'a@a.com', avatar: '' },
    })
  })

  it('syncProfile: อีเมลอยู่ใน SUPER_ADMIN_EMAILS — ตั้งเป็น SUPER_ADMIN แม้ role ที่ส่งมาจะเป็น CUSTOMER', async () => {
    const prevEnv = process.env.SUPER_ADMIN_EMAILS
    process.env.SUPER_ADMIN_EMAILS = 'Boss@Example.com, other@shop.com'
    try {
      const { service, prisma } = makeService()
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: 'u1' })

      await service.syncProfile('auth0|1', Role.CUSTOMER, { name: 'Boss', surname: '', email: 'boss@example.com' })

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { auth0Sub: 'auth0|1', role: Role.SUPER_ADMIN, name: 'Boss', surname: '', email: 'boss@example.com', avatar: '' },
      })
    } finally {
      process.env.SUPER_ADMIN_EMAILS = prevEnv
    }
  })

  it('syncProfile: มี user อยู่แล้วและกรอกชื่อ/นามสกุลเองไว้แล้ว — ไม่เขียนทับด้วยชื่อจาก Auth0', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'ชื่อที่แก้เอง', surname: 'นามสกุลที่แก้เอง' })
    prisma.user.update.mockResolvedValue({ id: 'u1' })

    await service.syncProfile('auth0|1', Role.CUSTOMER, { name: 'Google', surname: 'Name', email: 'a@a.com', avatar: 'pic.jpg' })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { auth0Sub: 'auth0|1' },
      data: { email: 'a@a.com', avatar: 'pic.jpg' },
    })
  })

  it('syncProfile: มี user อยู่แล้วแต่ชื่อ/นามสกุลว่างอยู่ — เติมจาก Auth0 ให้ (fallback)', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: '', surname: '' })
    prisma.user.update.mockResolvedValue({ id: 'u1' })

    await service.syncProfile('auth0|1', Role.CUSTOMER, { name: 'Google', surname: 'Name', email: 'a@a.com' })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { auth0Sub: 'auth0|1' },
      data: { email: 'a@a.com', avatar: '', name: 'Google', surname: 'Name' },
    })
  })
})
