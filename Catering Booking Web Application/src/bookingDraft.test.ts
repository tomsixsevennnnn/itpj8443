import { describe, expect, it } from 'vitest'
import type { BookingData } from './types'
import {
  BOOKING_DRAFT_KEY,
  firstIncompleteStep,
  loadBookingDraft,
  missingBookingField,
  saveBookingDraft,
} from './bookingDraft'

const INITIAL: BookingData = {
  date: null,
  timeSlot: null,
  tables: 2,
  guestCount: 20,
  location: null,
  packageId: null,
  packageName: null,
  packagePrice: 0,
  menuLimit: 9,
  selectedMenus: [],
}

const LOCATION = { address: 'x', lat: 1, lng: 2, zone: 'home' } as unknown as NonNullable<BookingData['location']>

const fakeStorage = () => {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const NOW = new Date(2026, 9, 3, 12, 0, 0) // 3 ต.ค. 2026

describe('firstIncompleteStep', () => {
  it('ยังไม่ได้เลือกอะไรเลย — เปิดหน้าไหนก็ถูกพากลับไปเลือกวัน/เวลาก่อน', () => {
    expect(firstIncompleteStep(INITIAL, 'select-table')).toBe('booking-calendar')
    expect(firstIncompleteStep(INITIAL, 'select-location')).toBe('booking-calendar')
    expect(firstIncompleteStep(INITIAL, 'cart')).toBe('booking-calendar')
  })

  it('หน้าแรกของขั้นตอน (เลือกวัน/เวลา) — เปิดได้เสมอ', () => {
    expect(firstIncompleteStep(INITIAL, 'booking-calendar')).toBeNull()
  })

  it('เลือกวัน/เวลาแล้วแต่ยังไม่มีสถานที่ — หน้าแพ็กเกจ/เมนู/สรุปพากลับไปเลือกสถานที่', () => {
    const b = { ...INITIAL, date: '2026-10-10', timeSlot: 'evening' }
    expect(firstIncompleteStep(b, 'select-table')).toBeNull()
    expect(firstIncompleteStep(b, 'select-location')).toBeNull()
    expect(firstIncompleteStep(b, 'select-package')).toBe('select-location')
    expect(firstIncompleteStep(b, 'cart')).toBe('select-location')
  })

  it('มีวัน/เวลา+สถานที่แล้วแต่ยังไม่เลือกแพ็กเกจ — หน้าเมนู/สรุปพากลับไปเลือกแพ็กเกจ', () => {
    const b = { ...INITIAL, date: '2026-10-10', timeSlot: 'evening', location: LOCATION }
    expect(firstIncompleteStep(b, 'select-package')).toBeNull()
    expect(firstIncompleteStep(b, 'select-menu')).toBe('select-package')
    expect(firstIncompleteStep(b, 'cart')).toBe('select-package')
  })

  it('ข้อมูลครบทุกขั้น — เปิดหน้าสรุปได้', () => {
    const b = { ...INITIAL, date: '2026-10-10', timeSlot: 'evening', location: LOCATION, packageId: 'p1' }
    expect(firstIncompleteStep(b, 'cart')).toBeNull()
  })

  it('หน้าที่ไม่ใช่ขั้นตอนการจอง — ไม่ยุ่ง', () => {
    expect(firstIncompleteStep(INITIAL, 'history')).toBeNull()
  })
})

describe('missingBookingField', () => {
  it('บอกรายการแรกที่ขาด และ null เมื่อครบ', () => {
    expect(missingBookingField(INITIAL)).toBe('วันและเวลา')
    expect(missingBookingField({ ...INITIAL, date: '2026-10-10', timeSlot: 'evening' })).toBe('สถานที่จัดงาน')
    expect(missingBookingField({ ...INITIAL, date: '2026-10-10', timeSlot: 'evening', location: LOCATION })).toBe('แพ็กเกจ')
    expect(
      missingBookingField({ ...INITIAL, date: '2026-10-10', timeSlot: 'evening', location: LOCATION, packageId: 'p1' }),
    ).toBeNull()
  })
})

describe('booking draft (เก็บข้อมูลจองข้ามการรีเฟรช)', () => {
  it('เก็บแล้วอ่านกลับได้ครบ (ร้านเดียวกัน)', () => {
    const storage = fakeStorage()
    const booking = { ...INITIAL, date: '2026-10-10', timeSlot: 'evening', tables: 8, location: LOCATION, packageId: 'p1' }

    saveBookingDraft('shop1', booking, INITIAL, storage)

    expect(loadBookingDraft('shop1', INITIAL, storage, NOW)).toEqual(booking)
  })

  it('ฉบับร่างของร้านอื่น — ไม่นำมาใช้', () => {
    const storage = fakeStorage()
    saveBookingDraft('shop1', { ...INITIAL, date: '2026-10-10', timeSlot: 'evening' }, INITIAL, storage)

    expect(loadBookingDraft('shop2', INITIAL, storage, NOW)).toEqual(INITIAL)
  })

  it('วันที่ที่เลือกไว้ผ่านไปแล้ว — ทิ้งวัน/เวลา แต่เก็บข้อมูลอื่นไว้', () => {
    const storage = fakeStorage()
    saveBookingDraft('shop1', { ...INITIAL, date: '2026-10-01', timeSlot: 'evening', tables: 8 }, INITIAL, storage)

    expect(loadBookingDraft('shop1', INITIAL, storage, NOW)).toEqual({ ...INITIAL, tables: 8, date: null, timeSlot: null })
  })

  it('วันนี้ยังใช้ได้ (ไม่ถือว่าผ่านไปแล้ว)', () => {
    const storage = fakeStorage()
    saveBookingDraft('shop1', { ...INITIAL, date: '2026-10-03', timeSlot: 'evening' }, INITIAL, storage)

    expect(loadBookingDraft('shop1', INITIAL, storage, NOW).date).toBe('2026-10-03')
  })

  it('กลับเป็นค่าเริ่มต้น (เช่นจองเสร็จแล้ว) — ลบฉบับร่างทิ้ง', () => {
    const storage = fakeStorage()
    saveBookingDraft('shop1', { ...INITIAL, date: '2026-10-10', timeSlot: 'evening' }, INITIAL, storage)
    saveBookingDraft('shop1', INITIAL, INITIAL, storage)

    expect(storage.getItem(BOOKING_DRAFT_KEY)).toBeNull()
  })

  it('ข้อมูลใน storage เสีย/อ่านไม่ได้ — ใช้ค่าเริ่มต้น ไม่ throw', () => {
    const storage = fakeStorage()
    storage.setItem(BOOKING_DRAFT_KEY, '{not json')

    expect(loadBookingDraft('shop1', INITIAL, storage, NOW)).toEqual(INITIAL)
  })
})
