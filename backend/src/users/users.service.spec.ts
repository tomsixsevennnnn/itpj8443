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

describe('UsersService', () => {
  it('setRole: ป้องกันไม่ให้ owner คนสุดท้ายถูก demote เป็น customer', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.OWNER })
    prisma.user.count.mockResolvedValue(1)

    await expect(service.setRole('u1', Role.CUSTOMER, 'auth0|editor')).rejects.toThrow(BadRequestException)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('setRole: demote ได้ถ้ายังมี owner คนอื่นเหลืออยู่', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.OWNER })
    prisma.user.count.mockResolvedValue(2)
    prisma.user.update.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })

    await expect(service.setRole('u1', Role.CUSTOMER, 'auth0|editor')).resolves.toEqual({ id: 'u1', role: Role.CUSTOMER })
  })

  it('setRole: promote customer เป็น owner ไม่ต้องเช็คจำนวน owner', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
    prisma.user.update.mockResolvedValue({ id: 'u1', role: Role.OWNER })

    await expect(service.setRole('u1', Role.OWNER, 'auth0|editor')).resolves.toEqual({ id: 'u1', role: Role.OWNER })
    expect(prisma.user.count).not.toHaveBeenCalled()
  })

  it('setRole: ไม่พบ user เลย throw NotFoundException', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(service.setRole('missing', Role.OWNER, 'auth0|editor')).rejects.toThrow(NotFoundException)
  })

  it('setRole: บันทึก audit log พร้อม role เดิม/ใหม่', async () => {
    const { service, prisma, audit } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
    prisma.user.update.mockResolvedValue({ id: 'u1', role: Role.OWNER })

    await service.setRole('u1', Role.OWNER, 'auth0|editor')

    expect(audit.log).toHaveBeenCalledWith(
      'auth0|editor',
      'user.setRole',
      'User',
      'u1',
      { role: Role.CUSTOMER },
      { role: Role.OWNER },
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
