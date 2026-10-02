import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { Role, ShopStatus } from '@prisma/client'
import { ShopsService } from './shops.service'

const makeService = () => {
  const prisma = {
    shop: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    settings: { create: jest.fn(), update: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    shopMember: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    booking: { groupBy: jest.fn() },
    // $transaction รองรับทั้งแบบ callback (createShop/updateShop) และแบบ array ของ promise (deleteShop)
    $transaction: jest.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
  } as any
  const audit = { log: jest.fn() } as any
  return { service: new ShopsService(prisma, audit), prisma, audit }
}

describe('ShopsService', () => {
  describe('listAll', () => {
    it('รวมยอดขาย (ไม่นับใบจองที่ยกเลิก) เข้ากับรายการร้านแต่ละร้าน', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findMany.mockResolvedValue([
        { id: 'shop1', name: 'ร้านเอ', _count: { members: 2, bookings: 3 } },
        { id: 'shop2', name: 'ร้านบี', _count: { members: 1, bookings: 0 } },
      ])
      prisma.booking.groupBy.mockResolvedValue([{ shopId: 'shop1', _sum: { totalPrice: 5000 } }])

      const result = await service.listAll()

      expect(result).toEqual([
        { id: 'shop1', name: 'ร้านเอ', _count: { owners: 2, bookings: 3 }, totalRevenue: 5000 },
        { id: 'shop2', name: 'ร้านบี', _count: { owners: 1, bookings: 0 }, totalRevenue: 0 },
      ])
      expect(prisma.booking.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: { not: 'CANCELLED' } } }),
      )
    })
  })

  describe('findBySlugPublic', () => {
    it('ไม่พบร้าน — throw NotFoundException', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findFirst.mockResolvedValue(null)

      await expect(service.findBySlugPublic('no-such-shop')).rejects.toThrow(NotFoundException)
    })

    it('ร้านปิดให้บริการ (ไม่ใช่ ACTIVE) — throw NotFoundException เหมือนไม่มีร้าน', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findFirst.mockResolvedValue({ id: 'shop1', name: 'ร้านเอ', slug: 'shop-a', status: ShopStatus.SUSPENDED })

      await expect(service.findBySlugPublic('shop-a')).rejects.toThrow(NotFoundException)
    })

    it('ร้าน ACTIVE — คืนข้อมูลร้าน', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findFirst.mockResolvedValue({ id: 'shop1', name: 'ร้านเอ', slug: 'shop-a', status: ShopStatus.ACTIVE })

      await expect(service.findBySlugPublic('shop-a')).resolves.toEqual(
        expect.objectContaining({ id: 'shop1', slug: 'shop-a' }),
      )
    })
  })

  describe('createShop', () => {
    it('ไม่พบผู้ใช้ตามอีเมล — throw NotFoundException', async () => {
      const { service, prisma } = makeService()
      prisma.user.findFirst.mockResolvedValue(null)

      await expect(
        service.createShop({ name: 'ร้านใหม่', ownerEmail: 'nobody@example.com' } as any, 'auth0|admin'),
      ).rejects.toThrow(NotFoundException)
    })

    it('ผู้ใช้เป็น super admin — throw BadRequestException', async () => {
      const { service, prisma } = makeService()
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.SUPER_ADMIN })

      await expect(
        service.createShop({ name: 'ร้านใหม่', ownerEmail: 'owner@example.com' } as any, 'auth0|admin'),
      ).rejects.toThrow(BadRequestException)
    })

    it('สร้างร้านสำเร็จ — สร้าง Shop + Settings + ตั้ง owner ให้ในทรานแซกชันเดียว', async () => {
      const { service, prisma, audit } = makeService()
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
      prisma.shop.findUnique.mockResolvedValue(null) // ไม่มี slug ซ้ำ
      prisma.shop.create.mockResolvedValue({ id: 'shop1', name: 'ร้านใหม่', slug: 'ร้านใหม่' })

      const result = await service.createShop({ name: 'ร้านใหม่', ownerEmail: 'owner@example.com' } as any, 'auth0|admin')

      expect(prisma.settings.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ shopId: 'shop1', shopName: 'ร้านใหม่' }) }),
      )
      expect(prisma.shopMember.create).toHaveBeenCalledWith({ data: { userId: 'u1', shopId: 'shop1' } })
      expect(audit.log).toHaveBeenCalledWith('auth0|admin', 'shop.create', 'Shop', 'shop1', undefined, result, 'shop1')
    })

    it('ผู้ใช้เป็น owner ร้านอื่นอยู่แล้ว — ตั้งเป็น owner ร้านใหม่เพิ่มได้ (1 คนเป็น owner หลายร้าน)', async () => {
      const { service, prisma } = makeService()
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
      prisma.shop.findUnique.mockResolvedValue(null)
      prisma.shop.create.mockResolvedValue({ id: 'shop3', name: 'ร้านสาม', slug: 'ร้านสาม' })

      await service.createShop({ name: 'ร้านสาม', ownerEmail: 'owner@example.com' } as any, 'auth0|admin')

      expect(prisma.shopMember.create).toHaveBeenCalledWith({ data: { userId: 'u1', shopId: 'shop3' } })
    })

    it('ชื่อซ้ำ slug เดิม — ต่อเลขท้าย slug ให้ไม่ชนกัน', async () => {
      const { service, prisma } = makeService()
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
      prisma.shop.findUnique
        .mockResolvedValueOnce({ id: 'other-shop' }) // slug แรกซ้ำ
        .mockResolvedValueOnce(null) // slug-2 ว่าง
      prisma.shop.create.mockResolvedValue({ id: 'shop2', name: 'ร้านเอ', slug: 'ร้านเอ-2' })

      await service.createShop({ name: 'ร้านเอ', ownerEmail: 'owner@example.com' } as any, 'auth0|admin')

      // slugify ตัดอักขระที่ไม่ใช่ \p{L}\p{N}- ทิ้ง (รวมวรรณยุกต์ซึ่งเป็น combining mark \p{M}) — "ร้านเอ" จึงกลาย
      // เป็น "รานเอ" (ไม้โทบน ร หลุดไป) ก่อนต่อเลขท้ายกันชนกับ slug เดิม
      expect(prisma.shop.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'รานเอ-2' }) }),
      )
    })
  })

  describe('updateShop', () => {
    it('ไม่พบร้าน — throw NotFoundException', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValue(null)

      await expect(service.updateShop('no-id', { name: 'ใหม่' } as any, 'auth0|admin')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('slug ใหม่ถูกร้านอื่นใช้อยู่แล้ว — throw ConflictException', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique
        .mockResolvedValueOnce({ id: 'shop1', name: 'เดิม', slug: 'old-slug' }) // before
        .mockResolvedValueOnce({ id: 'shop2' }) // slug ที่ขอใหม่มีร้านอื่นถืออยู่
      await expect(
        service.updateShop('shop1', { name: 'เดิม', slug: 'taken' } as any, 'auth0|admin'),
      ).rejects.toThrow(ConflictException)
    })

    it('แก้ชื่อร้าน — ซิงค์ไปที่ Settings.shopName ของร้านนั้นด้วย (increment version กัน owner บันทึกทับด้วย version เก่า)', async () => {
      const { service, prisma, audit } = makeService()
      prisma.shop.findUnique.mockResolvedValueOnce({ id: 'shop1', name: 'เดิม', slug: 'shop-a' }) // before
      prisma.shop.update.mockResolvedValue({ id: 'shop1', name: 'ใหม่', slug: 'shop-a' })

      const result = await service.updateShop('shop1', { name: 'ใหม่' } as any, 'auth0|admin')

      expect(prisma.settings.update).toHaveBeenCalledWith({
        where: { shopId: 'shop1' },
        data: { shopName: 'ใหม่', version: { increment: 1 } },
      })
      expect(audit.log).toHaveBeenCalledWith(
        'auth0|admin',
        'shop.update',
        'Shop',
        'shop1',
        { id: 'shop1', name: 'เดิม', slug: 'shop-a' },
        result,
        'shop1',
      )
    })

    it('ชื่อร้านไม่เปลี่ยน (ส่งชื่อเดิมมา) — ไม่ไปแตะ Settings.shopName', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValueOnce({ id: 'shop1', name: 'เดิม', slug: 'shop-a' })
      prisma.shop.update.mockResolvedValue({ id: 'shop1', name: 'เดิม', slug: 'shop-a' })

      await service.updateShop('shop1', { name: 'เดิม' } as any, 'auth0|admin')

      expect(prisma.settings.update).not.toHaveBeenCalled()
    })

    it('ไม่ส่ง slug มา — ไม่แตะ slug เดิม (ไม่เช็คชนกับร้านอื่นด้วย)', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValueOnce({ id: 'shop1', name: 'เดิม', slug: 'shop-a' })
      prisma.shop.update.mockResolvedValue({ id: 'shop1', name: 'ใหม่', slug: 'shop-a' })

      await service.updateShop('shop1', { name: 'ใหม่' } as any, 'auth0|admin')

      expect(prisma.shop.findUnique).toHaveBeenCalledTimes(1) // เรียกแค่ครั้งเดียว (หา before) ไม่เรียกเช็ค slug ซ้ำ
      expect(prisma.shop.update).toHaveBeenCalledWith({ where: { id: 'shop1' }, data: { name: 'ใหม่', slug: undefined } })
    })
  })

  describe('setStatus', () => {
    it('ไม่พบร้าน — throw NotFoundException', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValue(null)

      await expect(service.setStatus('no-id', ShopStatus.SUSPENDED, 'auth0|admin')).rejects.toThrow(NotFoundException)
    })

    it('เปลี่ยนสถานะสำเร็จ — บันทึก audit log', async () => {
      const { service, prisma, audit } = makeService()
      prisma.shop.findUnique.mockResolvedValue({ id: 'shop1', status: ShopStatus.ACTIVE })
      prisma.shop.update.mockResolvedValue({ id: 'shop1', status: ShopStatus.SUSPENDED })

      await service.setStatus('shop1', ShopStatus.SUSPENDED, 'auth0|admin')

      expect(audit.log).toHaveBeenCalledWith(
        'auth0|admin',
        'shop.setStatus',
        'Shop',
        'shop1',
        { id: 'shop1', status: ShopStatus.ACTIVE },
        { id: 'shop1', status: ShopStatus.SUSPENDED },
        'shop1',
      )
    })
  })

  describe('addOwner', () => {
    it('ไม่พบร้าน — throw NotFoundException', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValue(null)

      await expect(service.addOwner('no-id', 'x@example.com', 'auth0|admin')).rejects.toThrow(NotFoundException)
    })

    it('ไม่พบผู้ใช้ตามอีเมล — throw NotFoundException', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValue({ id: 'shop1' })
      prisma.user.findFirst.mockResolvedValue(null)

      await expect(service.addOwner('shop1', 'nobody@example.com', 'auth0|admin')).rejects.toThrow(NotFoundException)
    })

    it('ผู้ใช้เป็น super admin — throw ConflictException', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValue({ id: 'shop1' })
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.SUPER_ADMIN })

      await expect(service.addOwner('shop1', 'boss@example.com', 'auth0|admin')).rejects.toThrow(ConflictException)
    })

    it('ผู้ใช้เป็น owner ร้านนี้อยู่แล้ว — throw ConflictException ไม่เพิ่มซ้ำ', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValue({ id: 'shop1' })
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
      prisma.shopMember.findUnique.mockResolvedValue({ id: 'm1' })

      await expect(service.addOwner('shop1', 'owner@example.com', 'auth0|admin')).rejects.toThrow(ConflictException)
      expect(prisma.shopMember.create).not.toHaveBeenCalled()
    })

    it('เพิ่ม owner สำเร็จ — เพิ่ม ShopMember (ไม่แตะ role ระดับระบบของผู้ใช้)', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValue({ id: 'shop1' })
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
      prisma.shopMember.findUnique.mockResolvedValue(null)

      await service.addOwner('shop1', 'owner@example.com', 'auth0|admin')

      expect(prisma.shopMember.create).toHaveBeenCalledWith({ data: { userId: 'u1', shopId: 'shop1' } })
    })
  })

  describe('removeOwner', () => {
    it('ไม่พบผู้ใช้ — throw NotFoundException', async () => {
      const { service, prisma } = makeService()
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.removeOwner('shop1', 'no-user', 'auth0|admin')).rejects.toThrow(NotFoundException)
    })

    it('ผู้ใช้ไม่ใช่ owner ของร้านนี้ — throw BadRequestException', async () => {
      const { service, prisma } = makeService()
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER })
      prisma.shopMember.findUnique.mockResolvedValue(null)

      await expect(service.removeOwner('shop1', 'u1', 'auth0|admin')).rejects.toThrow(BadRequestException)
      expect(prisma.shopMember.delete).not.toHaveBeenCalled()
    })

    it('ถอด owner สำเร็จ — ลบ ShopMember ของร้านนี้เท่านั้น', async () => {
      const { service, prisma } = makeService()
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CUSTOMER, email: 'o@example.com' })
      prisma.shopMember.findUnique.mockResolvedValue({ id: 'm1' })

      await service.removeOwner('shop1', 'u1', 'auth0|admin')

      expect(prisma.shopMember.delete).toHaveBeenCalledWith({ where: { id: 'm1' } })
    })
  })

  describe('deleteShop', () => {
    it('ไม่พบร้าน — throw NotFoundException', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValue(null)

      await expect(service.deleteShop('no-id', 'ชื่อ', 'auth0|admin')).rejects.toThrow(NotFoundException)
    })

    it('พิมพ์ชื่อยืนยันไม่ตรง — throw BadRequestException ไม่ลบจริง', async () => {
      const { service, prisma } = makeService()
      prisma.shop.findUnique.mockResolvedValue({ id: 'shop1', name: 'ร้านเอ' })

      await expect(service.deleteShop('shop1', 'ชื่อผิด', 'auth0|admin')).rejects.toThrow(BadRequestException)
      expect(prisma.shop.delete).not.toHaveBeenCalled()
    })

    it('ยืนยันชื่อตรง — ลบร้านทิ้ง (ShopMember ลบตามด้วย cascade) ไม่แตะบัญชีผู้ใช้', async () => {
      const { service, prisma, audit } = makeService()
      prisma.shop.findUnique.mockResolvedValue({ id: 'shop1', name: 'ร้านเอ' })

      await service.deleteShop('shop1', 'ร้านเอ', 'auth0|admin')

      expect(prisma.shop.delete).toHaveBeenCalledWith({ where: { id: 'shop1' } })
      // shopId ของ audit log ต้องเป็น null (ไม่ใช่ id ร้านที่ลบไปแล้ว) กัน cascade ลบประวัตินี้ไปด้วย
      expect(audit.log).toHaveBeenCalledWith(
        'auth0|admin',
        'shop.delete',
        'Shop',
        'shop1',
        { id: 'shop1', name: 'ร้านเอ' },
        undefined,
        null,
      )
    })
  })
})
