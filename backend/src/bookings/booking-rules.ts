import { BookingStatus } from '@prisma/client'

/**
 * การเปลี่ยนสถานะใบจองที่ owner ทำได้ (ต้องตรงกับ frontend src/bookingStatus.ts):
 *  - ยกเลิกแล้ว (CANCELLED) เปลี่ยนต่อไม่ได้ — คืนคิวให้คนอื่นไปแล้ว เปิดกลับอาจจองซ้อนวันเดียวกัน (ต้องให้ลูกค้าจองใหม่)
 *  - เสร็จสิ้น (COMPLETED) แก้กลับได้แค่เป็นยืนยันแล้ว (กรณีกดผิด) ยกเลิกหรือกลับไปรอยืนยันไม่ได้ — งานจัดไปแล้ว
 */
const ALLOWED_NEXT: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.PENDING, BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.COMPLETED]: [BookingStatus.CONFIRMED],
  [BookingStatus.CANCELLED]: [],
}

/** เปลี่ยนจาก from เป็น to ได้หรือไม่ (สถานะเดิม = ไม่ได้เปลี่ยน ถือว่าได้) */
export const isStatusTransitionAllowed = (from: BookingStatus, to: BookingStatus): boolean =>
  from === to || ALLOWED_NEXT[from].includes(to)

const BANGKOK = 'Asia/Bangkok'

/** วันนี้ตามเวลาไทยในรูป YYYY-MM-DD (เซิร์ฟเวอร์อาจรันเป็น UTC จึงระบุเขตเวลาเอง) — เทียบกับ booking.date ที่เป็นข้อความรูปเดียวกันได้ตรงๆ */
export const todayInBangkok = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: BANGKOK, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

/** วันที่จัดงานย้อนหลัง (ก่อนวันนี้) ไม่ได้ — จองวันนี้ได้ */
export const isPastEventDate = (date: string, now: Date = new Date()): boolean => date < todayInBangkok(now)
