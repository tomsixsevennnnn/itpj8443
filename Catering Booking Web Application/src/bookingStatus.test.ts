import { describe, expect, it } from 'vitest'
import { STATUS_BUTTON_LABEL, canChangeStatus } from './bookingStatus'

describe('canChangeStatus (ตรงกับกฎของ backend)', () => {
  it('สถานะเดิม — ผ่านเสมอ', () => {
    for (const s of ['pending', 'confirmed', 'completed', 'cancelled'] as const) expect(canChangeStatus(s, s)).toBe(true)
  })

  it('รอยืนยัน/ยืนยันแล้ว — ไปต่อและย้อนกลับได้ตามกฎ', () => {
    expect(canChangeStatus('pending', 'confirmed')).toBe(true)
    expect(canChangeStatus('pending', 'cancelled')).toBe(true)
    expect(canChangeStatus('confirmed', 'pending')).toBe(true)
    expect(canChangeStatus('confirmed', 'completed')).toBe(true)
  })

  it('เสร็จสิ้นแล้ว — กลับเป็นยืนยันแล้วได้ แต่ห้ามรอยืนยัน/ยกเลิก', () => {
    expect(canChangeStatus('completed', 'confirmed')).toBe(true)
    expect(canChangeStatus('completed', 'pending')).toBe(false)
    expect(canChangeStatus('completed', 'cancelled')).toBe(false)
  })

  it('ยกเลิกแล้ว — เปลี่ยนต่อไม่ได้', () => {
    for (const to of ['pending', 'confirmed', 'completed'] as const) expect(canChangeStatus('cancelled', to)).toBe(false)
  })
})

describe('STATUS_BUTTON_LABEL', () => {
  it('ครบทุกสถานะจริง และ pending ไม่ใช้คำว่า "รอยืนยัน" (กันสับสนกับป้ายรอร้านยืนยัน)', () => {
    expect(Object.keys(STATUS_BUTTON_LABEL).sort()).toEqual(['cancelled', 'completed', 'confirmed', 'pending'])
    expect(STATUS_BUTTON_LABEL.pending).toBe('ยังไม่ยืนยัน')
  })
})
