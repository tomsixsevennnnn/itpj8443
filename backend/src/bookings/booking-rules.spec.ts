import { BookingStatus } from '@prisma/client'
import { isPastEventDate, isStatusTransitionAllowed, todayInBangkok } from './booking-rules'

describe('isStatusTransitionAllowed', () => {
  it('สถานะเดิม — ไม่ถือว่าเปลี่ยน ผ่านเสมอ', () => {
    for (const s of Object.values(BookingStatus)) expect(isStatusTransitionAllowed(s, s)).toBe(true)
  })

  it('รอยืนยัน → ยืนยัน/เสร็จสิ้น/ยกเลิก ได้', () => {
    expect(isStatusTransitionAllowed('PENDING', 'CONFIRMED')).toBe(true)
    expect(isStatusTransitionAllowed('PENDING', 'COMPLETED')).toBe(true)
    expect(isStatusTransitionAllowed('PENDING', 'CANCELLED')).toBe(true)
  })

  it('ยืนยันแล้ว → ย้อนกลับรอยืนยันได้ (แก้กดผิด) ไปต่อเป็นเสร็จสิ้น/ยกเลิกได้', () => {
    expect(isStatusTransitionAllowed('CONFIRMED', 'PENDING')).toBe(true)
    expect(isStatusTransitionAllowed('CONFIRMED', 'COMPLETED')).toBe(true)
    expect(isStatusTransitionAllowed('CONFIRMED', 'CANCELLED')).toBe(true)
  })

  it('เสร็จสิ้น → กลับเป็นยืนยันแล้วได้เท่านั้น (ห้ามกลับรอยืนยัน/ห้ามยกเลิก)', () => {
    expect(isStatusTransitionAllowed('COMPLETED', 'CONFIRMED')).toBe(true)
    expect(isStatusTransitionAllowed('COMPLETED', 'PENDING')).toBe(false)
    expect(isStatusTransitionAllowed('COMPLETED', 'CANCELLED')).toBe(false)
  })

  it('ยกเลิกแล้ว → เปลี่ยนต่อไม่ได้เลย (คืนคิวไปแล้ว)', () => {
    for (const to of ['PENDING', 'CONFIRMED', 'COMPLETED'] as const) expect(isStatusTransitionAllowed('CANCELLED', to)).toBe(false)
  })
})

describe('วันที่จัดงาน', () => {
  it('todayInBangkok: ใช้เวลาไทย (UTC+7) ไม่ใช่ UTC — 17:30 UTC ของวันที่ 10 คือเช้ามืดวันที่ 11 ในไทย', () => {
    expect(todayInBangkok(new Date('2026-10-10T17:30:00Z'))).toBe('2026-10-11')
    expect(todayInBangkok(new Date('2026-10-10T16:59:00Z'))).toBe('2026-10-10')
  })

  it('isPastEventDate: ก่อนวันนี้ = ย้อนหลัง, วันนี้และอนาคต = ไม่ย้อนหลัง', () => {
    const now = new Date('2026-10-10T05:00:00Z') // 12:00 น. วันที่ 10 ต.ค. ตามเวลาไทย
    expect(isPastEventDate('2026-10-09', now)).toBe(true)
    expect(isPastEventDate('2026-10-10', now)).toBe(false)
    expect(isPastEventDate('2026-10-11', now)).toBe(false)
  })
})
