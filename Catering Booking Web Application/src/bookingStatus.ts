import type { Booking } from './types'

type Status = Booking['status']

/**
 * การเปลี่ยนสถานะใบจองที่ owner ทำได้ (ต้องตรงกับ backend src/bookings/booking-rules.ts ที่เป็นตัวตัดสินจริง):
 *  - ยกเลิกแล้วเปลี่ยนต่อไม่ได้ (คืนคิวไปแล้ว ต้องให้ลูกค้าจองใหม่)
 *  - เสร็จสิ้นแล้วแก้กลับได้แค่เป็นยืนยันแล้ว (กรณีกดผิด) ยกเลิกหรือกลับไปรอยืนยันไม่ได้ เพราะงานจัดไปแล้ว
 */
const ALLOWED_NEXT: Record<Status, Status[]> = {
  pending: ['confirmed', 'completed', 'cancelled'],
  confirmed: ['pending', 'completed', 'cancelled'],
  completed: ['confirmed'],
  cancelled: [],
}

/** เปลี่ยนจาก from เป็น to ได้หรือไม่ (สถานะเดิม = ไม่ได้เปลี่ยน ถือว่าได้) */
export const canChangeStatus = (from: Status, to: Status): boolean => from === to || ALLOWED_NEXT[from].includes(to)

/** ชื่อบนปุ่ม "อัปเดตสถานะ" ของเจ้าของร้าน (สถานะจริง) — pending เขียนว่า "ยังไม่ยืนยัน" ไม่ใช่ "รอยืนยัน" เพราะป้ายในรายการแยกเป็น
 *  "รอโอนมัดจำ"/"รอร้านยืนยัน" ตามขั้นตอน (ดู bookingPhase.ts) ถ้าปุ่มยังเขียน "รอยืนยัน" จะสับสนว่าตรงกับป้ายไหน */
export const STATUS_BUTTON_LABEL: Record<Status, string> = {
  pending: 'ยังไม่ยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}

/** ข้อความอธิบายตอนปุ่มเปลี่ยนสถานะถูกปิด */
export const STATUS_LOCKED_HINT = 'เปลี่ยนเป็นสถานะนี้ไม่ได้จากสถานะปัจจุบัน (ยกเลิกแล้วเปิดกลับไม่ได้ / งานเสร็จสิ้นแล้วยกเลิกหรือกลับไปรอยืนยันไม่ได้)'
