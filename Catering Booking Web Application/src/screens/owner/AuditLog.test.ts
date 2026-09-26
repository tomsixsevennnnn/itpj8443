import { describe, expect, it } from 'vitest'
import { diffCourseList, formatFieldValue } from './AuditLog'

/** ทดสอบตรงๆ ว่า diffCourseList/formatFieldValue ยังให้ผลลัพธ์เหมือนก่อนแยกฟังก์ชันย่อย
 *  (ลด cognitive complexity) — สองฟังก์ชันนี้เป็น pure logic ล้วนๆ ไม่มี JSX/hook เลยเทสต์ตรงๆ ได้ */
describe('diffCourseList', () => {
  it('ข้อที่หายไปหลังแก้ไข — รายงานว่าลบข้อนั้น', () => {
    const before = [{ no: 1, title: 'ข้อ A', category: 'savory', choose: 1, items: [] }]
    expect(diffCourseList(before, [])).toEqual(['ลบข้อ 1 "ข้อ A" ออกจากแพ็กเกจ'])
  })

  it('ข้อใหม่ที่มีเมนู — รายงานว่าเพิ่มข้อใหม่พร้อมรายชื่อเมนู', () => {
    const after = [{ no: 1, title: 'ข้อ A', category: 'savory', choose: 1, items: [{ id: 'i1', name: 'ต้มยำ' }] }]
    expect(diffCourseList([], after)).toEqual(['เพิ่มข้อใหม่ 1 "ข้อ A" (1 อย่าง): ต้มยำ'])
  })

  it('ข้อใหม่ที่ยังไม่มีเมนู — รายงานว่ายังไม่มีเมนู', () => {
    const after = [{ no: 1, title: 'ข้อ A', category: 'savory', choose: 1, items: [] }]
    expect(diffCourseList([], after)).toEqual(['เพิ่มข้อใหม่ 1 "ข้อ A" (ยังไม่มีเมนู)'])
  })

  it('ข้อเดิมไม่มีอะไรเปลี่ยน — ไม่มีบรรทัดรายงาน', () => {
    const course = { no: 1, title: 'ข้อ A', category: 'savory', choose: 1, items: [{ id: 'i1', name: 'ต้มยำ' }] }
    expect(diffCourseList([course], [course])).toEqual([])
  })

  it('ข้อเดิมเปลี่ยนชื่อ/ประเภท/จำนวนที่เลือก/เมนู — รวมการเปลี่ยนแปลงทั้งหมดไว้บรรทัดเดียว', () => {
    const before = [{ no: 1, title: 'ข้อ A', category: 'savory', choose: 1, items: [{ id: 'i1', name: 'ต้มยำ' }] }]
    const after = [{ no: 1, title: 'ข้อ B', category: 'sweet', choose: 2, items: [{ id: 'i2', name: 'ขนมหวาน' }] }]
    expect(diffCourseList(before, after)).toEqual([
      'ข้อ 1 "ข้อ B" — ชื่อข้อ: "ข้อ A" → "ข้อ B" · ประเภทอาหาร: savory → sweet · จำนวนที่ลูกค้าเลือกได้: 1 → 2 · เพิ่มเมนู: ขนมหวาน · ลบเมนู: ต้มยำ',
    ])
  })

  it('before/after ไม่ใช่ array — ถือว่าว่างเปล่าทั้งคู่ ไม่ throw', () => {
    expect(diffCourseList(null, undefined)).toEqual([])
  })
})

describe('formatFieldValue', () => {
  it('ค่า null/ว่าง — คืน placeholder', () => {
    expect(formatFieldValue('anything', null)).toBe('— (ว่าง)')
    expect(formatFieldValue('anything', '')).toBe('— (ว่าง)')
  })

  it('deletedAt — คืนข้อความ "ถูกลบเมื่อ" พร้อมวันที่', () => {
    expect(formatFieldValue('deletedAt', '2026-01-01T00:00:00.000Z')).toMatch(/^ถูกลบเมื่อ/)
  })

  it('role — แปล OWNER/อื่นๆ เป็นไทย', () => {
    expect(formatFieldValue('role', 'OWNER')).toBe('เจ้าของร้าน')
    expect(formatFieldValue('role', 'CUSTOMER')).toBe('ลูกค้า')
  })

  it('status — ใช้ label ตาม BOOKING_STATUS_LABEL', () => {
    expect(formatFieldValue('status', 'pending')).toBe('รอยืนยัน')
    expect(formatFieldValue('status', 'unknown_status')).toBe('unknown_status')
  })

  it('boolean field "active" — แปลเป็นเปิดขาย/ปิดขาย', () => {
    expect(formatFieldValue('active', true)).toBe('เปิดขาย')
    expect(formatFieldValue('active', false)).toBe('ปิดขาย')
  })

  it('boolean field อื่นๆ — แปลเป็นใช่/ไม่ใช่', () => {
    expect(formatFieldValue('featured', true)).toBe('ใช่')
    expect(formatFieldValue('featured', false)).toBe('ไม่ใช่')
  })

  it('depositRate — แปลงเป็น %', () => {
    expect(formatFieldValue('depositRate', 0.5)).toBe('50%')
  })

  it('ฟิลด์ราคา — เติมหน่วยบาท', () => {
    expect(formatFieldValue('deliveryFee', 2000)).toBe('2,000 บาท')
  })

  it('ตัวเลขทั่วไป — แค่ toLocaleString', () => {
    expect(formatFieldValue('tablesPerServer', 8)).toBe('8')
  })

  it('array ของ string ล้วน — join ด้วยจุลภาค', () => {
    expect(formatFieldValue('bookingTerms', ['ก', 'ข'])).toBe('ก, ข')
    expect(formatFieldValue('bookingTerms', [])).toBe('— (ว่าง)')
  })

  it('object ทั่วไปที่ไม่มีตัวสรุปเฉพาะทาง — คืนข้อความกลางๆ', () => {
    expect(formatFieldValue('someObjectField', { a: 1 })).toBe('มีการเปลี่ยนแปลง (รายละเอียดซับซ้อน)')
  })

  it('string ทั่วไป — คืนค่าตรงๆ', () => {
    expect(formatFieldValue('name', 'ร้าน A')).toBe('ร้าน A')
  })
})
