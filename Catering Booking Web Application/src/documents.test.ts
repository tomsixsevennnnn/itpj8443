import { describe, expect, it } from 'vitest'
import { bahtText, bookingPricing, docNumber, quotationValidUntil } from './documents'
import type { Booking } from './types'

const makeBooking = (overrides: Partial<Booking>): Booking => ({
  id: 'clx1234567890abcdef',
  customerName: 'ทดสอบ',
  bookingYear: 2026,
  bookingNo: 7,
  date: '2026-01-15',
  timeSlot: 'เย็น (17:00-21:00)',
  tables: 5,
  guestCount: 50,
  packageName: 'โต๊ะจีน 3,000',
  totalPrice: 17000,
  status: 'pending',
  location: 'ทดสอบ',
  menus: [],
  phone: '080-000-0000',
  ...overrides,
})

describe('bahtText', () => {
  it('แปลงจำนวนเงินเป็นบาทตัวอักษรถูกต้อง', () => {
    expect(bahtText(16050)).toBe('หนึ่งหมื่นหกพันห้าสิบบาทถ้วน')
  })

  it('ศูนย์บาท', () => {
    expect(bahtText(0)).toBe('ศูนย์บาทถ้วน')
  })

  it('มีสตางค์', () => {
    expect(bahtText(100.5)).toBe('หนึ่งร้อยบาทห้าสิบสตางค์')
  })
})

describe('docNumber', () => {
  it('ใบเสนอราคาใช้ QT- นำหน้า + 8 ตัวท้ายของ id (ไม่พึ่งรูปแบบ id เดิม)', () => {
    const booking = makeBooking({ id: 'clx1234567890abcdef' })
    expect(docNumber(booking, 'quotation')).toBe('QT-90ABCDEF')
  })

  it('ใบจองใช้เลขที่จองจริง BK-{ปี}-{เลขลำดับ} ไม่ผูกกับ id ฐานข้อมูล', () => {
    const booking = makeBooking({ bookingYear: 2026, bookingNo: 7 })
    expect(docNumber(booking, 'booking')).toBe('BK-2026-007')
  })
})

describe('bookingPricing', () => {
  it('คำนวณยอดครบ: หักค่าขนส่งออกจากยอดรวมก่อนหาราคา/โต๊ะ', () => {
    const booking = makeBooking({ totalPrice: 17000, deliveryFee: 2000, tables: 5 })
    const pricing = bookingPricing(booking, 0.5)
    expect(pricing.subtotal).toBe(15000)
    expect(pricing.pricePerTable).toBe(3000)
    expect(pricing.deliveryFee).toBe(2000)
    expect(pricing.total).toBe(17000)
    expect(pricing.deposit).toBe(8500)
    expect(pricing.remaining).toBe(8500)
  })

  it('ไม่มีค่าขนส่ง = ยอดค่าอาหารเท่ากับยอดรวม', () => {
    const booking = makeBooking({ totalPrice: 10000, deliveryFee: undefined, tables: 5 })
    const pricing = bookingPricing(booking, 0.5)
    expect(pricing.subtotal).toBe(10000)
    expect(pricing.deliveryFee).toBe(0)
  })
})

describe('quotationValidUntil', () => {
  it('ยืนราคา 7 วันนับจากวันที่ออก', () => {
    const from = new Date('2026-01-01T00:00:00.000Z')
    expect(quotationValidUntil(from)).toBe('2026-01-08')
  })
})
