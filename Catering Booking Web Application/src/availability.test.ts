import { describe, expect, it } from 'vitest'
import { dayStatus, remainingFor, slotIdOf, slotUsage, toDateKey } from './availability'
import type { Booking } from './types'

const makeBooking = (overrides: Partial<Booking>): Booking => ({
  id: overrides.id ?? 'BK-1',
  customerName: 'ทดสอบ',
  bookingYear: 2026,
  bookingNo: 1,
  date: '2026-01-15',
  timeSlot: 'เย็น (17:00-21:00)',
  tables: 5,
  guestCount: 50,
  packageName: 'โต๊ะจีน 3,000',
  totalPrice: 15000,
  status: 'pending',
  location: 'ทดสอบ',
  menus: [],
  phone: '080-000-0000',
  ...overrides,
})

describe('slotIdOf', () => {
  it('แปลงข้อความช่วงเวลาเป็นรหัสช่วงถูกต้อง', () => {
    expect(slotIdOf('เช้า (08:00-12:00)')).toBe('morning')
    expect(slotIdOf('กลางวัน (12:00-16:00)')).toBe('noon')
    expect(slotIdOf('เย็น (17:00-21:00)')).toBe('evening')
    expect(slotIdOf('ทั้งวัน (08:00-21:00)')).toBe('allday')
  })

  it('ข้อความที่จำไม่ได้ ถือเป็นทั้งวัน (ปลอดภัยไว้ก่อน)', () => {
    expect(slotIdOf('ไม่ทราบช่วง')).toBe('allday')
  })
})

describe('slotUsage', () => {
  it('รวมโต๊ะเฉพาะใบจองที่ยังกินคิว (ไม่นับที่ยกเลิก)', () => {
    const bookings = [
      makeBooking({ id: '1', date: '2026-01-15', timeSlot: 'เช้า (08:00-12:00)', tables: 10, status: 'pending' }),
      makeBooking({ id: '2', date: '2026-01-15', timeSlot: 'เช้า (08:00-12:00)', tables: 5, status: 'cancelled' }),
      makeBooking({ id: '3', date: '2026-01-16', timeSlot: 'เช้า (08:00-12:00)', tables: 99, status: 'pending' }),
    ]
    const usage = slotUsage(bookings, '2026-01-15')
    expect(usage.morning).toBe(10)
    expect(usage.noon).toBe(0)
    expect(usage.evening).toBe(0)
  })

  it('งานทั้งวันกินคิวทุกช่วงเวลา', () => {
    const bookings = [makeBooking({ date: '2026-01-15', timeSlot: 'ทั้งวัน (08:00-21:00)', tables: 20 })]
    const usage = slotUsage(bookings, '2026-01-15')
    expect(usage.morning).toBe(20)
    expect(usage.noon).toBe(20)
    expect(usage.evening).toBe(20)
  })
})

describe('remainingFor', () => {
  it('ความจุ 500 โต๊ะต่อช่วง หักด้วยที่จองไปแล้ว', () => {
    const bookings = [makeBooking({ date: '2026-01-15', timeSlot: 'เช้า (08:00-12:00)', tables: 100 })]
    expect(remainingFor(bookings, '2026-01-15', 'morning')).toBe(400)
  })

  it('ไม่ติดลบแม้จองเกินความจุ', () => {
    const bookings = [makeBooking({ date: '2026-01-15', timeSlot: 'เช้า (08:00-12:00)', tables: 600 })]
    expect(remainingFor(bookings, '2026-01-15', 'morning')).toBe(0)
  })
})

describe('dayStatus', () => {
  it('จองแล้ว 1 งาน (ช่วงใดก็ได้) = เต็มทั้งวัน', () => {
    const bookings = [makeBooking({ date: '2026-01-15', timeSlot: 'เช้า (08:00-12:00)' })]
    expect(dayStatus(bookings, '2026-01-15')).toBe('full')
  })

  it('ไม่มีใบจอง = ว่าง', () => {
    expect(dayStatus([], '2026-01-15')).toBe('available')
  })

  it('มีแต่ใบจองที่ยกเลิกแล้ว = ยังว่างอยู่', () => {
    const bookings = [makeBooking({ date: '2026-01-15', status: 'cancelled' })]
    expect(dayStatus(bookings, '2026-01-15')).toBe('available')
  })
})

describe('toDateKey', () => {
  it('จัดรูปแบบวันที่เป็น YYYY-MM-DD พร้อม padding', () => {
    expect(toDateKey(2026, 0, 5)).toBe('2026-01-05')
    expect(toDateKey(2026, 11, 25)).toBe('2026-12-25')
  })
})
