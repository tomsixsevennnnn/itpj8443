import { Role } from '@prisma/client'
import { resolveShopContext } from './shop-context'

const makePrisma = (user: { id: string; role: Role; memberships: { shopId: string }[] } | null) =>
  ({ user: { findUnique: jest.fn().mockResolvedValue(user) } }) as any

describe('resolveShopContext', () => {
  it('ไม่พบผู้ใช้ — null', async () => {
    await expect(resolveShopContext(makePrisma(null), 'auth0|1', 'shop1')).resolves.toBeNull()
  })

  it('super admin — SUPER_ADMIN ไม่ผูกร้าน ไม่ว่า header จะเป็นร้านไหน', async () => {
    const prisma = makePrisma({ id: 'u1', role: Role.SUPER_ADMIN, memberships: [] })
    await expect(resolveShopContext(prisma, 'auth0|1', 'shop1')).resolves.toEqual({ id: 'u1', role: Role.SUPER_ADMIN, shopId: null })
  })

  it('owner ของร้านที่เปิดอยู่ — OWNER ของร้านนั้น', async () => {
    const prisma = makePrisma({ id: 'u1', role: Role.CUSTOMER, memberships: [{ shopId: 'shop2' }] })
    await expect(resolveShopContext(prisma, 'auth0|1', 'shop2')).resolves.toEqual({ id: 'u1', role: Role.OWNER, shopId: 'shop2' })
  })

  it('owner ร้าน 2 เปิดร้าน 1 — เป็น CUSTOMER (ไม่ได้สิทธิ์ owner ข้ามร้านจากการส่ง header)', async () => {
    const prisma = makePrisma({ id: 'u1', role: Role.CUSTOMER, memberships: [{ shopId: 'shop2' }] })
    await expect(resolveShopContext(prisma, 'auth0|1', 'shop1')).resolves.toEqual({ id: 'u1', role: Role.CUSTOMER, shopId: null })
  })

  it('owner หลายร้าน — header เลือกร้านที่เป็น owner ได้ทั้งสอง', async () => {
    const prisma = makePrisma({ id: 'u1', role: Role.CUSTOMER, memberships: [{ shopId: 'shop1' }, { shopId: 'shop2' }] })
    await expect(resolveShopContext(prisma, 'auth0|1', 'shop2')).resolves.toEqual({ id: 'u1', role: Role.OWNER, shopId: 'shop2' })
    await expect(resolveShopContext(prisma, 'auth0|1', 'shop1')).resolves.toEqual({ id: 'u1', role: Role.OWNER, shopId: 'shop1' })
  })

  it('ไม่ส่ง header — ใช้ร้านแรกที่เป็น owner (เก่าสุด) ถ้ามี', async () => {
    const prisma = makePrisma({ id: 'u1', role: Role.CUSTOMER, memberships: [{ shopId: 'shop1' }, { shopId: 'shop2' }] })
    await expect(resolveShopContext(prisma, 'auth0|1')).resolves.toEqual({ id: 'u1', role: Role.OWNER, shopId: 'shop1' })
  })

  it('ไม่ส่ง header และไม่ได้เป็น owner ร้านไหนเลย — CUSTOMER', async () => {
    const prisma = makePrisma({ id: 'u1', role: Role.CUSTOMER, memberships: [] })
    await expect(resolveShopContext(prisma, 'auth0|1')).resolves.toEqual({ id: 'u1', role: Role.CUSTOMER, shopId: null })
  })
})
