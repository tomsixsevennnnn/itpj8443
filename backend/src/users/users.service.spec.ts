import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Role } from '@prisma/client'
import { fetchVerifiedIdentity } from '../auth/userinfo'
import { UsersService } from './users.service'

jest.mock('../auth/userinfo')
const mockedIdentity = fetchVerifiedIdentity as jest.MockedFunction<typeof fetchVerifiedIdentity>

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
    shopMember: { findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), delete: jest.fn(), count: jest.fn() },
    shopInvite: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  } as any
  const audit = { log: jest.fn() } as any
  return { service: new UsersService(prisma, audit), prisma, audit }
}

/** ผู้ใช้พร้อม memberships ตามที่ UsersService ดึงจาก DB (include MEMBERSHIPS_INCLUDE) */
const userWith = (id: string, role: Role, shopIds: string[]) => ({
  id,
  role,
  memberships: shopIds.map((shopId) => ({ shopId, shop: { id: shopId, name: shopId, slug: shopId } })),
})

const OWNER_EDITOR = { id: 'editor1', role: Role.OWNER, shopId: 'shop1' }
const SUPER_ADMIN_EDITOR = { id: 'sa1', role: Role.SUPER_ADMIN, shopId: null }

const MEMBERSHIPS_INCLUDE_EXPECTED = {
  memberships: {
    orderBy: { createdAt: 'asc' },
    select: { shopId: true, shop: { select: { id: true, name: true, slug: true } } },
  },
}

describe('UsersService', () => {
  describe('claimOwnerInvites', () => {
    beforeEach(() => mockedIdentity.mockReset())

    it('ไม่มีคำเชิญเลยในระบบ — ไม่เรียก Auth0 และคืน false', async () => {
      const { service } = makeService()
      expect(await service.claimOwnerInvites('auth0|u1', 'Bearer t')).toBe(false)
      expect(mockedIdentity).not.toHaveBeenCalled()
    })

    it('super admin ไม่รับสิทธิ์เจ้าของร้านจากคำเชิญ', async () => {
      const { service, prisma } = makeService()
      prisma.shopInvite.count.mockResolvedValue(1)
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.SUPER_ADMIN })
      expect(await service.claimOwnerInvites('auth0|u1', 'Bearer t')).toBe(false)
      expect(mockedIdentity).not.toHaveBeenCalled()
    })

    it('อีเมลยังไม่ถูก Auth0 ยืนยัน หรือถามไม่ได้ — ไม่ให้สิทธิ์ คำเชิญยังอยู่', async () => {
      const { service, prisma } = makeService()
      prisma.shopInvite.count.mockResolvedValue(1)
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
      mockedIdentity.mockResolvedValueOnce({ email: 'owner@gmail.com', emailVerified: false })
      expect(await service.claimOwnerInvites('auth0|u1', 'Bearer t')).toBe(false)
      mockedIdentity.mockResolvedValueOnce(null)
      expect(await service.claimOwnerInvites('auth0|u1', 'Bearer t')).toBe(false)
      expect(prisma.shopMember.createMany).not.toHaveBeenCalled()
      expect(prisma.shopInvite.deleteMany).not.toHaveBeenCalled()
    })

    it('อีเมลยืนยันแล้วแต่ไม่มีคำเชิญตรงกัน — คืน false', async () => {
      const { service, prisma } = makeService()
      prisma.shopInvite.count.mockResolvedValue(1)
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
      mockedIdentity.mockResolvedValue({ email: 'someone@gmail.com', emailVerified: true })
      prisma.shopInvite.findMany.mockResolvedValue([])
      expect(await service.claimOwnerInvites('auth0|u1', 'Bearer t')).toBe(false)
    })

    it('อีเมลยืนยันแล้วและตรงคำเชิญ (ไม่สนตัวพิมพ์) — สร้าง ShopMember ทุกร้านที่เชิญ ลบคำเชิญ บันทึก audit', async () => {
      const { service, prisma, audit } = makeService()
      prisma.shopInvite.count.mockResolvedValue(2)
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
      mockedIdentity.mockResolvedValue({ email: 'Owner@Gmail.com', emailVerified: true })
      prisma.shopInvite.findMany.mockResolvedValue([
        { id: 'i1', shopId: 'shopA', email: 'owner@gmail.com' },
        { id: 'i2', shopId: 'shopB', email: 'owner@gmail.com' },
      ])

      expect(await service.claimOwnerInvites('auth0|u1', 'Bearer t')).toBe(true)

      expect(prisma.shopInvite.findMany).toHaveBeenCalledWith({ where: { email: 'owner@gmail.com' } })
      expect(prisma.shopMember.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'u1', shopId: 'shopA' },
          { userId: 'u1', shopId: 'shopB' },
        ],
        skipDuplicates: true,
      })
      expect(prisma.shopInvite.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['i1', 'i2'] } } })
      expect(audit.log).toHaveBeenCalledTimes(2)
    })
  })

  it('setRole: ป้องกันไม่ให้ owner คนสุดท้ายของร้านถูก demote เป็น customer', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(userWith('u1', Role.CUSTOMER, ['shop1']))
    prisma.shopMember.count.mockResolvedValue(1)

    await expect(service.setRole('u1', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)).rejects.toThrow(BadRequestException)
    expect(prisma.shopMember.delete).not.toHaveBeenCalled()
  })

  it('setRole: demote ได้ถ้ายังมี owner คนอื่นเหลืออยู่ในร้านเดียวกัน — ลบแค่ ShopMember ของร้านนี้', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique
      .mockResolvedValueOnce(userWith('u1', Role.CUSTOMER, ['shop1', 'shop2']))
      .mockResolvedValueOnce(userWith('u1', Role.CUSTOMER, ['shop2']))
    prisma.shopMember.count.mockResolvedValue(2)

    const result = await service.setRole('u1', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)

    expect(prisma.shopMember.count).toHaveBeenCalledWith({ where: { shopId: 'shop1' } })
    expect(prisma.shopMember.delete).toHaveBeenCalledWith({ where: { userId_shopId: { userId: 'u1', shopId: 'shop1' } } })
    // ยังเป็น owner ร้าน 2 อยู่ แต่ในมุมมองร้าน 1 (ร้านของผู้แก้) กลับเป็นลูกค้าแล้ว
    expect(result).toEqual(expect.objectContaining({ id: 'u1', role: Role.CUSTOMER, shopId: null }))
  })

  it('setRole: demote คนที่ไม่ได้เป็น owner ของร้านนี้ (เป็น owner ร้านอื่น) ไม่ได้', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(userWith('u1', Role.CUSTOMER, ['shop2']))

    await expect(service.setRole('u1', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)).rejects.toThrow(BadRequestException)
    expect(prisma.shopMember.delete).not.toHaveBeenCalled()
  })

  it('setRole: owner promote customer เป็น owner — เพิ่ม ShopMember ของร้านตัวเอง', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique
      .mockResolvedValueOnce(userWith('u1', Role.CUSTOMER, []))
      .mockResolvedValueOnce(userWith('u1', Role.CUSTOMER, ['shop1']))

    const result = await service.setRole('u1', Role.OWNER, 'auth0|editor', OWNER_EDITOR)

    expect(prisma.shopMember.create).toHaveBeenCalledWith({ data: { userId: 'u1', shopId: 'shop1' } })
    expect(prisma.shopMember.count).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({ id: 'u1', role: Role.OWNER, shopId: 'shop1' }))
  })

  it('setRole: คนที่เป็น owner ร้านอื่นอยู่แล้ว เลื่อนเป็น owner ร้านนี้เพิ่มได้ (1 คนเป็น owner หลายร้าน)', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique
      .mockResolvedValueOnce(userWith('u1', Role.CUSTOMER, ['shop2']))
      .mockResolvedValueOnce(userWith('u1', Role.CUSTOMER, ['shop2', 'shop1']))

    await service.setRole('u1', Role.OWNER, 'auth0|editor', OWNER_EDITOR)

    expect(prisma.shopMember.create).toHaveBeenCalledWith({ data: { userId: 'u1', shopId: 'shop1' } })
  })

  it('setRole: promote คนที่เป็น owner ร้านนี้อยู่แล้ว — ไม่สร้างซ้ำ', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(userWith('u1', Role.CUSTOMER, ['shop1']))

    await service.setRole('u1', Role.OWNER, 'auth0|editor', OWNER_EDITOR)

    expect(prisma.shopMember.create).not.toHaveBeenCalled()
  })

  it('setRole: owner แตะบัญชี super admin ไม่ได้', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(userWith('u1', Role.SUPER_ADMIN, []))

    await expect(service.setRole('u1', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)).rejects.toThrow(BadRequestException)
  })

  it('setRole: owner ตั้งใครเป็น super admin ไม่ได้', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(userWith('u1', Role.CUSTOMER, []))

    await expect(service.setRole('u1', Role.SUPER_ADMIN, 'auth0|editor', OWNER_EDITOR)).rejects.toThrow(BadRequestException)
  })

  it('setRole: super admin ตั้งใครเป็น OWNER ผ่าน endpoint นี้ตรงๆ ไม่ได้ (ต้องผ่านหน้าจัดการร้าน)', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(userWith('u1', Role.CUSTOMER, []))

    await expect(service.setRole('u1', Role.OWNER, 'auth0|sa', SUPER_ADMIN_EDITOR)).rejects.toThrow(BadRequestException)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('setRole: super admin เปลี่ยนสิทธิ์ของคนที่เป็น owner ร้านใดร้านหนึ่งอยู่ไม่ได้', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(userWith('u1', Role.CUSTOMER, ['shop1']))

    await expect(service.setRole('u1', Role.SUPER_ADMIN, 'auth0|sa', SUPER_ADMIN_EDITOR)).rejects.toThrow(BadRequestException)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('setRole: super admin เลื่อน customer เป็น super admin ได้ปกติ', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique
      .mockResolvedValueOnce(userWith('u1', Role.CUSTOMER, []))
      .mockResolvedValueOnce(userWith('u1', Role.SUPER_ADMIN, []))

    const result = await service.setRole('u1', Role.SUPER_ADMIN, 'auth0|sa', SUPER_ADMIN_EDITOR)

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { role: Role.SUPER_ADMIN } })
    expect(result).toEqual(expect.objectContaining({ id: 'u1', role: Role.SUPER_ADMIN }))
  })

  it('setRole: ไม่พบ user เลย throw NotFoundException', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(service.setRole('missing', Role.CUSTOMER, 'auth0|editor', OWNER_EDITOR)).rejects.toThrow(NotFoundException)
  })

  it('setRole: บันทึก audit log พร้อมสิทธิ์เดิม/ใหม่ และ shopId ของผู้แก้ไข', async () => {
    const { service, prisma, audit } = makeService()
    prisma.user.findUnique
      .mockResolvedValueOnce(userWith('u1', Role.CUSTOMER, []))
      .mockResolvedValueOnce(userWith('u1', Role.CUSTOMER, ['shop1']))

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

  it('shopContextFor: เป็น owner ร้านที่เปิดอยู่ = OWNER ของร้านนั้น, ร้านอื่น = CUSTOMER (บัญชีเดียวใช้ได้ทั้งสองบทบาท)', async () => {
    const { service, prisma } = makeService()
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER, memberships: [{ shopId: 'shop2' }] })

    await expect(service.shopContextFor('auth0|1', 'shop2')).resolves.toEqual({ id: 'u1', role: Role.OWNER, shopId: 'shop2' })
    await expect(service.shopContextFor('auth0|1', 'shop1')).resolves.toEqual({ id: 'u1', role: Role.CUSTOMER, shopId: null })
  })

  it('searchByEmail: ไม่ส่งเบอร์โทร/Line ID ของผู้ใช้ออกไป (owner ค้นหาข้ามร้านได้ — ข้อมูลส่วนตัวของลูกค้าต้องไม่รั่ว)', async () => {
    const { service, prisma } = makeService()
    prisma.user.findMany.mockResolvedValue([{ ...userWith('a', Role.CUSTOMER, []), phone: '0812345678', lineId: '@secret', email: 'a@x.com' }])

    const [user] = await service.searchByEmail('a', 'shop1')

    expect(user).not.toHaveProperty('phone')
    expect(user).not.toHaveProperty('lineId')
    expect(user).toEqual(expect.objectContaining({ id: 'a', email: 'a@x.com' }))
  })

  it('searchByEmail: owner ค้นหา — role = OWNER เฉพาะคนที่เป็น owner ของร้านตัวเอง (ไม่นับร้านอื่น)', async () => {
    const { service, prisma } = makeService()
    prisma.user.findMany.mockResolvedValue([
      userWith('a', Role.CUSTOMER, ['shop1']),
      userWith('b', Role.CUSTOMER, ['shop2']),
      userWith('c', Role.CUSTOMER, []),
    ])

    const result = await service.searchByEmail('x', 'shop1')

    expect(result.map((u) => [u.id, u.role])).toEqual([
      ['a', Role.OWNER],
      ['b', Role.CUSTOMER],
      ['c', Role.CUSTOMER],
    ])
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
      include: MEMBERSHIPS_INCLUDE_EXPECTED,
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
        include: MEMBERSHIPS_INCLUDE_EXPECTED,
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
      include: MEMBERSHIPS_INCLUDE_EXPECTED,
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
      include: MEMBERSHIPS_INCLUDE_EXPECTED,
    })
  })
})
