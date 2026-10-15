import { BookingStatus } from '@prisma/client'
import { isPastEventDate, isStatusTransitionAllowed, menuQuotaViolation, todayInBangkok } from './booking-rules'

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

describe('menuQuotaViolation', () => {
  const courses = [
    { title: 'ของหวาน', choose: 0, items: [{ name: 'มะพร้าวอ่อน' }] }, // รวมมาให้
    { title: 'จานหลัก', choose: 2, items: [{ name: 'ปลานึ่ง' }, { name: 'ไก่ทอด' }, { name: 'กุ้งอบ' }] },
    { title: 'ซุป', choose: 1, items: [{ name: 'ต้มยำ' }, { name: 'ต้มจืด' }] },
  ]

  it('เลือกตามโควตา (รวมของที่แพ็กเกจให้มา) — ผ่าน', () => {
    expect(menuQuotaViolation(courses, ['มะพร้าวอ่อน', 'ปลานึ่ง', 'ไก่ทอด', 'ต้มยำ'])).toBeNull()
  })

  it('เลือกน้อยกว่าโควตา ไม่ปฏิเสธ', () => {
    expect(menuQuotaViolation(courses, ['ปลานึ่ง'])).toBeNull()
    expect(menuQuotaViolation(courses, [])).toBeNull()
  })

  it('เลือกเมนูในข้อเดียวเกินที่กำหนด — ไม่ผ่าน (ต้มยำ+ต้มจืด เกิน 1 อย่าง)', () => {
    expect(menuQuotaViolation(courses, ['ต้มยำ', 'ต้มจืด'])).toContain('ซุป')
  })

  it('เลือกครบทุกเมนูในแพ็กเกจ (เรียก API ตรง) — ไม่ผ่านเพราะเกินจำนวนรวม', () => {
    expect(menuQuotaViolation(courses, ['มะพร้าวอ่อน', 'ปลานึ่ง', 'ไก่ทอด', 'กุ้งอบ', 'ต้มยำ', 'ต้มจืด'])).toContain('เกินจำนวนที่แพ็กเกจกำหนด')
  })

  it('เมนูซ้ำชื่อไม่นับซ้ำ และเมนูที่รวมมาให้ไม่กินโควตาการเลือก', () => {
    expect(menuQuotaViolation(courses, ['ปลานึ่ง', 'ปลานึ่ง', 'มะพร้าวอ่อน', 'มะพร้าวอ่อน'])).toBeNull()
  })
})
