import type { Booking } from './types'

/**
 * "ขั้นตอน" ของใบจองที่ผู้ใช้เห็น (5 แบบ) — คำนวณจากสถานะจริงใน DB (4 แบบ) + มีสลิปหรือยัง ไม่ต้องเก็บเพิ่มใน DB
 * สถานะจริงและกฎเปลี่ยนสถานะ (booking-rules / bookingStatus) ไม่เปลี่ยน — ใช้แสดงป้ายและกรองรายการเท่านั้น:
 *  - awaiting-deposit = จองแล้วยังไม่มีสลิป หรือสลิปไม่ผ่าน (ลูกค้าต้องโอน/แนบใหม่)
 *  - awaiting-review  = มีสลิปแล้ว รอร้านตรวจสอบและกดยืนยัน (เจ้าของร้านต้องลงมือ)
 *  - confirmed / completed / cancelled = ตามสถานะจริง
 */
export type BookingPhase = 'awaiting-deposit' | 'awaiting-review' | 'confirmed' | 'completed' | 'cancelled'

type PhaseInput = Pick<Booking, 'status' | 'paymentSlip' | 'paymentSlipUploadedAt' | 'paymentSlipVerifyStatus'>

/** ผลตรวจ SlipOK ที่แปลว่าสลิปใบนี้ใช้ไม่ได้ ต้องแนบใหม่ (ตรวจไม่ได้ชั่วคราว UNAVAILABLE ไม่นับ — ไม่ใช่ความผิดของสลิป) */
const REJECTED = new Set(['DUPLICATE', 'AMOUNT_MISMATCH', 'ACCOUNT_MISMATCH', 'REJECTED'])

export const hasSlip = (b: Pick<Booking, 'paymentSlip' | 'paymentSlipUploadedAt'>): boolean =>
  !!(b.paymentSlip || b.paymentSlipUploadedAt)

/** ใบจองที่รอชำระ มีสลิปแต่ SlipOK ปฏิเสธ — ลูกค้าต้องแนบสลิปใหม่ */
export const slipNeedsReplacement = (b: PhaseInput): boolean =>
  b.status === 'pending' && hasSlip(b) && !!b.paymentSlipVerifyStatus && REJECTED.has(b.paymentSlipVerifyStatus)

export const bookingPhase = (b: PhaseInput): BookingPhase => {
  if (b.status !== 'pending') return b.status
  if (!hasSlip(b) || slipNeedsReplacement(b)) return 'awaiting-deposit'
  return 'awaiting-review'
}

export interface PhaseStyle {
  label: string
  bg: string
  text: string
  dot: string
  border: string
  /** บอกว่าใครต้องทำอะไรต่อ */
  hint: string
}

export const PHASE_INFO: Record<BookingPhase, PhaseStyle> = {
  'awaiting-deposit': {
    label: 'รอโอนมัดจำ',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    border: 'border-amber-300',
    hint: 'ลูกค้าโอนมัดจำแล้วแนบสลิป',
  },
  'awaiting-review': {
    label: 'รอร้านยืนยัน',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-400',
    border: 'border-blue-300',
    hint: 'ร้านตรวจมัดจำแล้วกดยืนยัน',
  },
  confirmed: {
    label: 'ยืนยันแล้ว',
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-400',
    border: 'border-green-300',
    hint: 'รอวันงาน',
  },
  completed: {
    label: 'เสร็จสิ้น',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    dot: 'bg-gray-400',
    border: 'border-gray-300',
    hint: '',
  },
  cancelled: {
    label: 'ยกเลิก',
    bg: 'bg-red-100',
    text: 'text-red-600',
    dot: 'bg-red-400',
    border: 'border-red-300',
    hint: '',
  },
}

/** หมายเหตุใต้ป้าย — เฉพาะสลิปไม่ผ่านที่ลูกค้าต้องแนบใหม่ */
export const phaseNote = (b: PhaseInput): string => (slipNeedsReplacement(b) ? 'สลิปไม่ผ่าน — แนบใหม่' : '')

/** ลำดับปุ่มกรองรายการตามขั้นตอน */
export const PHASE_FILTER_ORDER: BookingPhase[] = ['awaiting-review', 'awaiting-deposit', 'confirmed', 'completed', 'cancelled']
