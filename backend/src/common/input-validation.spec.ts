import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateBookingDto } from '../bookings/dto/create-booking.dto'
import { LocationDetailDto } from '../bookings/dto/location-detail.dto'
import { CreateMenuItemDto } from '../menus/dto/create-menu-item.dto'
import { CreatePackageDto } from '../packages/dto/create-package.dto'
import { UpdateSettingsDto } from '../settings/dto/update-settings.dto'
import { SyncProfileDto } from '../users/dto/sync-profile.dto'
import { UpdateProfileDto } from '../users/dto/update-profile.dto'
import { MAX_NUMBER } from './input-rules'

const errorsOf = async (cls: new () => object, plain: Record<string, unknown>) => {
  const dto = plainToInstance(cls, plain) as Record<string, unknown>
  const errors = await validate(dto, { whitelist: true })
  return { dto, fields: errors.map(e => e.property) }
}

describe('UpdateProfileDto — ข้อมูลติดต่อลูกค้า', () => {
  it('ข้อมูลถูกต้อง — ผ่าน และชื่อ/เบอร์/Line ID ถูกทำความสะอาด', async () => {
    const { dto, fields } = await errorsOf(UpdateProfileDto, {
      name: ' สมชาย 1 ',
      surname: "ใจ-ดี",
      phone: '081-234-5678',
      lineId: 'som chai!@01',
    })
    expect(fields).toEqual([])
    expect(dto.name).toBe('สมชาย')
    expect(dto.surname).toBe('ใจดี')
    expect(dto.phone).toBe('0812345678')
    expect(dto.lineId).toBe('somchai@01')
  })

  it('เบอร์โทรไม่ครบ/ไม่ขึ้นต้นด้วย 0/ยาวเกิน — ไม่ผ่าน', async () => {
    for (const phone of ['0812', '812345678', '08123456789', 'abc']) {
      expect((await errorsOf(UpdateProfileDto, { phone })).fields).toContain('phone')
    }
    expect((await errorsOf(UpdateProfileDto, { phone: '021234567' })).fields).toEqual([]) // เบอร์บ้าน 9 หลัก
  })

  it('ชื่อที่ตัดตัวเลข/อักษรพิเศษแล้วว่างเปล่า — ไม่ผ่าน (กันชื่อถูกลบเงียบๆ) และยาวเกิน 50 — ไม่ผ่าน', async () => {
    expect((await errorsOf(UpdateProfileDto, { name: '123!!' })).fields).toContain('name')
    expect((await errorsOf(UpdateProfileDto, { surname: 'ก'.repeat(51) })).fields).toContain('surname')
  })

  it('Line ID ว่างได้ (ช่องไม่บังคับ) แต่ยาวเกิน 30 ไม่ผ่าน', async () => {
    expect((await errorsOf(UpdateProfileDto, { lineId: '' })).fields).toEqual([])
    expect((await errorsOf(UpdateProfileDto, { lineId: 'a'.repeat(31) })).fields).toContain('lineId')
  })
})

describe('CreateBookingDto / LocationDetailDto', () => {
  const valid = {
    shopId: 's1',
    date: '2030-05-20',
    timeSlot: 'เย็น (17:00-21:00)',
    tables: 10,
    guestCount: 100,
    packageId: 'p1',
    location: 'นครปฐม',
    locationDetail: { lat: 13.82, lng: 100.06 },
    menus: ['m1'],
  }

  it('ข้อมูลถูกต้อง — ผ่าน', async () => {
    expect((await errorsOf(CreateBookingDto, valid)).fields).toEqual([])
  })

  it('วันที่ที่ไม่มีอยู่จริง (2030-02-31, 2030-13-45) — ไม่ผ่าน', async () => {
    for (const date of ['2030-02-31', '2030-13-45']) {
      expect((await errorsOf(CreateBookingDto, { ...valid, date })).fields).toContain('date')
    }
  })

  it('จำนวนแขกเกินเพดาน 50,000 — ไม่ผ่าน', async () => {
    expect((await errorsOf(CreateBookingDto, { ...valid, guestCount: MAX_NUMBER + 1 })).fields).toContain('guestCount')
    expect((await errorsOf(CreateBookingDto, { ...valid, guestCount: MAX_NUMBER })).fields).toEqual([])
  })

  it('ข้อความยาวเกินกำหนด (สถานที่ ช่วงเวลา Line ID) — ไม่ผ่าน', async () => {
    expect((await errorsOf(CreateBookingDto, { ...valid, location: 'ก'.repeat(1501) })).fields).toContain('location')
    expect((await errorsOf(CreateBookingDto, { ...valid, location: 'ก'.repeat(1500) })).fields).toEqual([])
    expect((await errorsOf(CreateBookingDto, { ...valid, timeSlot: 'ก'.repeat(61) })).fields).toContain('timeSlot')
  })

  it('Line ID ตอนจอง: ตัดอักขระผิดและตัดให้ไม่เกิน 30 ตัว แทนการปฏิเสธ (ผู้ใช้เก่าจองได้ต่อ)', async () => {
    const { dto, fields } = await errorsOf(CreateBookingDto, { ...valid, lineId: `ก${'a'.repeat(40)}!` })
    expect(fields).toEqual([])
    expect(dto.lineId).toBe('a'.repeat(30))
  })

  it('รายละเอียดสถานที่: ข้อความยาวเกิน — ไม่ผ่าน', async () => {
    const base = { lat: 13.8, lng: 100.0 }
    expect((await errorsOf(LocationDetailDto, { ...base, address: 'ก'.repeat(501) })).fields).toContain('address')
    expect((await errorsOf(LocationDetailDto, { ...base, detail: { landmark: 'ก'.repeat(301) } })).fields).toContain('detail')
    expect((await errorsOf(LocationDetailDto, { ...base, address: 'ก'.repeat(500), detail: { landmark: 'ก'.repeat(300) } })).fields).toEqual([])
  })
})

describe('CreateMenuItemDto / CreatePackageDto', () => {
  it('ราคาทุนเมนูติดลบหรือเกินเพดาน — ไม่ผ่าน, 0 และเพดานผ่าน', async () => {
    const base = { name: 'ปลา', category: 'main' }
    expect((await errorsOf(CreateMenuItemDto, { ...base, costPrice: -1 })).fields).toContain('costPrice')
    expect((await errorsOf(CreateMenuItemDto, { ...base, costPrice: MAX_NUMBER + 1 })).fields).toContain('costPrice')
    expect((await errorsOf(CreateMenuItemDto, { ...base, costPrice: 0 })).fields).toEqual([])
    expect((await errorsOf(CreateMenuItemDto, { ...base, costPrice: MAX_NUMBER })).fields).toEqual([])
  })

  it('ชื่อ/คำอธิบายเมนูยาวเกิน และชื่อว่าง — ไม่ผ่าน', async () => {
    const base = { category: 'main' }
    expect((await errorsOf(CreateMenuItemDto, { ...base, name: 'ก'.repeat(101) })).fields).toContain('name')
    expect((await errorsOf(CreateMenuItemDto, { ...base, name: '' })).fields).toContain('name')
    expect((await errorsOf(CreateMenuItemDto, { ...base, name: 'ปลา', description: 'ก'.repeat(1001) })).fields).toContain('description')
  })

  it('แพ็กเกจ: ราคาต่อโต๊ะเกินเพดาน, ชื่อ/คำอธิบาย/จุดเด่นยาวเกิน — ไม่ผ่าน', async () => {
    const base = { name: 'แพ็กเกจ', pricePerTable: 5000, menuLimit: 3, courses: [] }
    expect((await errorsOf(CreatePackageDto, base)).fields).toEqual([])
    expect((await errorsOf(CreatePackageDto, { ...base, pricePerTable: MAX_NUMBER + 1 })).fields).toContain('pricePerTable')
    expect((await errorsOf(CreatePackageDto, { ...base, name: 'ก'.repeat(101) })).fields).toContain('name')
    expect((await errorsOf(CreatePackageDto, { ...base, description: 'ก'.repeat(1001) })).fields).toContain('description')
    expect((await errorsOf(CreatePackageDto, { ...base, features: ['ก'.repeat(201)] })).fields).toContain('features')
    expect((await errorsOf(CreatePackageDto, { ...base, features: Array(31).fill('ก') })).fields).toContain('features')
  })
})

describe('UpdateSettingsDto — เพดาน ความยาว และวันหยุดร้าน', () => {
  const base = { expectedVersion: 1 }

  it('ตัวเลขที่ไม่มีเพดาน (ค่าขนส่ง ค่าน้ำมัน/กม. วันยืนราคา) เกิน 50,000 — ไม่ผ่าน', async () => {
    expect((await errorsOf(UpdateSettingsDto, { ...base, deliveryFee: MAX_NUMBER + 1 })).fields).toContain('deliveryFee')
    expect((await errorsOf(UpdateSettingsDto, { ...base, fuelCostPerKm: MAX_NUMBER + 1 })).fields).toContain('fuelCostPerKm')
    expect((await errorsOf(UpdateSettingsDto, { ...base, quotationValidDays: MAX_NUMBER + 1 })).fields).toContain('quotationValidDays')
    expect((await errorsOf(UpdateSettingsDto, { ...base, deliveryFee: MAX_NUMBER, fuelCostPerKm: MAX_NUMBER, quotationValidDays: MAX_NUMBER })).fields).toEqual([])
  })

  it('ข้อความอิสระยาวเกิน (ชื่อร้าน ที่อยู่ คำโปรย เงื่อนไขเอกสาร) — ไม่ผ่าน', async () => {
    expect((await errorsOf(UpdateSettingsDto, { ...base, shopName: 'ก'.repeat(101) })).fields).toContain('shopName')
    expect((await errorsOf(UpdateSettingsDto, { ...base, shopAddress: 'ก'.repeat(301) })).fields).toContain('shopAddress')
    expect((await errorsOf(UpdateSettingsDto, { ...base, shopLoginTagline: 'ก'.repeat(151) })).fields).toContain('shopLoginTagline')
    expect((await errorsOf(UpdateSettingsDto, { ...base, bookingTerms: ['ก'.repeat(501)] })).fields).toContain('bookingTerms')
    expect((await errorsOf(UpdateSettingsDto, { ...base, quotationTerms: Array(21).fill('ก') })).fields).toContain('quotationTerms')
    expect(
      (await errorsOf(UpdateSettingsDto, { ...base, shopName: 'ก'.repeat(100), shopAddress: 'ก'.repeat(300), bookingTerms: ['ก'.repeat(500)] })).fields,
    ).toEqual([])
  })

  it('วันหยุดร้านต้องเป็นวันที่ที่มีอยู่จริง', async () => {
    expect((await errorsOf(UpdateSettingsDto, { ...base, closedDates: ['2030-05-20', '2030-12-25'] })).fields).toEqual([])
    expect((await errorsOf(UpdateSettingsDto, { ...base, closedDates: ['2030-02-31'] })).fields).toContain('closedDates')
    expect((await errorsOf(UpdateSettingsDto, { ...base, closedDates: ['2030-13-45'] })).fields).toContain('closedDates')
    expect((await errorsOf(UpdateSettingsDto, { ...base, closedDates: ['20300520'] })).fields).toContain('closedDates')
  })
})

describe('SyncProfileDto — ข้อมูลจากบัญชี Google ตอน login', () => {
  it('ข้อความยาวเกินถูกตัดแทนการปฏิเสธ (ไม่ให้ login ไม่ได้) และไม่ error', async () => {
    const { dto, fields } = await errorsOf(SyncProfileDto, {
      name: 'ก'.repeat(300),
      surname: 'ข'.repeat(300),
      email: `${'a'.repeat(400)}@x.com`,
      avatar: 'https://x.com/' + 'p'.repeat(900),
    })
    expect(fields).toEqual([])
    expect((dto.name as string).length).toBe(100)
    expect((dto.surname as string).length).toBe(100)
    expect((dto.email as string).length).toBe(254)
    expect((dto.avatar as string).length).toBe(500)
  })
})
