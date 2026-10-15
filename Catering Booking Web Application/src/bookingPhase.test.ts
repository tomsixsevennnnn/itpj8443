import { describe, expect, it } from 'vitest'
import { PHASE_INFO, bookingPhase, canQuickConfirm, ownerNextStep, phaseNote, slipNeedsReplacement } from './bookingPhase'

type B = Parameters<typeof bookingPhase>[0]
const booking = (over: Partial<B>): B => ({ status: 'pending', ...over })

describe('bookingPhase', () => {
  it('รอยืนยัน + ยังไม่มีสลิป = รอโอนมัดจำ', () => {
    expect(bookingPhase(booking({}))).toBe('awaiting-deposit')
  })

  it('รอยืนยัน + มีสลิป (ผ่าน/ยังไม่ได้ตรวจ/ตรวจไม่ได้ชั่วคราว) = รอร้านยืนยัน', () => {
    expect(bookingPhase(booking({ paymentSlipUploadedAt: '2030-01-01', paymentSlipVerifyStatus: 'VERIFIED' }))).toBe('awaiting-review')
    expect(bookingPhase(booking({ paymentSlip: 'x' }))).toBe('awaiting-review')
    expect(bookingPhase(booking({ paymentSlipUploadedAt: '2030-01-01', paymentSlipVerifyStatus: 'UNAVAILABLE' }))).toBe('awaiting-review')
  })

  it('รอยืนยัน + สลิปถูก SlipOK ปฏิเสธ = กลับไปรอโอนมัดจำ (ต้องแนบใหม่)', () => {
    for (const s of ['DUPLICATE', 'AMOUNT_MISMATCH', 'ACCOUNT_MISMATCH', 'REJECTED'] as const) {
      const b = booking({ paymentSlipUploadedAt: '2030-01-01', paymentSlipVerifyStatus: s })
      expect(bookingPhase(b)).toBe('awaiting-deposit')
      expect(slipNeedsReplacement(b)).toBe(true)
      expect(phaseNote(b)).toBe('สลิปไม่ผ่าน — แนบใหม่')
    }
  })

  it('สถานะอื่นตามสถานะจริง ไม่สนสลิป', () => {
    expect(bookingPhase(booking({ status: 'confirmed' }))).toBe('confirmed')
    expect(bookingPhase(booking({ status: 'confirmed', paymentSlipVerifyStatus: 'REJECTED', paymentSlipUploadedAt: 'x' }))).toBe('confirmed')
    expect(bookingPhase(booking({ status: 'completed' }))).toBe('completed')
    expect(bookingPhase(booking({ status: 'cancelled' }))).toBe('cancelled')
  })

  it('หมายเหตุสลิปไม่ผ่านขึ้นเฉพาะใบที่ยังรอชำระ', () => {
    expect(phaseNote(booking({ status: 'confirmed', paymentSlipUploadedAt: 'x', paymentSlipVerifyStatus: 'REJECTED' }))).toBe('')
    expect(phaseNote(booking({}))).toBe('')
  })

  it('ทุกขั้นตอนมีป้ายและสี', () => {
    for (const info of Object.values(PHASE_INFO)) {
      expect(info.label).not.toBe('')
      expect(info.bg).toMatch(/^bg-/)
    }
  })
})

describe('ownerNextStep / canQuickConfirm', () => {
  it('รอโอนมัดจำ — บอกว่ารอลูกค้า และไม่มีปุ่มลัดยืนยัน', () => {
    const b = booking({})
    expect(ownerNextStep(b)).toContain('ลูกค้ายังไม่ได้โอนมัดจำ')
    expect(canQuickConfirm(b)).toBe(false)
  })

  it('สลิปไม่ผ่าน — บอกให้รอลูกค้าแนบใหม่ และไม่มีปุ่มลัด', () => {
    const b = booking({ paymentSlipUploadedAt: '2030-01-01', paymentSlipVerifyStatus: 'AMOUNT_MISMATCH' })
    expect(ownerNextStep(b)).toContain('ตรวจไม่ผ่าน')
    expect(canQuickConfirm(b)).toBe(false)
  })

  it('รอร้านยืนยัน (ส่งสลิปแล้ว) — บอกให้ตรวจแล้วยืนยัน และมีปุ่มลัด', () => {
    const b = booking({ paymentSlipUploadedAt: '2030-01-01', paymentSlipVerifyStatus: 'VERIFIED' })
    expect(ownerNextStep(b)).toContain('ตรวจมัดจำ')
    expect(canQuickConfirm(b)).toBe(true)
  })

  it('ยืนยันแล้ว/เสร็จสิ้น/ยกเลิก — มีคำอธิบายและไม่มีปุ่มลัด', () => {
    for (const status of ['confirmed', 'completed', 'cancelled'] as const) {
      const b = booking({ status })
      expect(ownerNextStep(b)).not.toBe('')
      expect(canQuickConfirm(b)).toBe(false)
    }
  })
})
