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
/** แพ็กเกจแต่ละ "ข้อ": choose = 0 คือรวมมาให้ทุกอย่างในข้อ, choose > 0 คือเลือกได้กี่อย่าง */
export interface CourseForQuota {
  title?: string
  choose: number
  items: { name: string }[]
}

/**
 * ตรวจว่าเมนูที่ลูกค้าเลือกไม่เกินโควตาที่แพ็กเกจกำหนด (ตรวจเฉพาะ "เกิน" — เลือกน้อยกว่าไม่ปฏิเสธ) คืนข้อความเมื่อผิดกฎ ไม่ผิด = null
 * เมนูที่รวมมาให้ (ข้อ choose = 0) ไม่นับเป็นการเลือก; ที่เหลือต้องไม่เกินผลรวม choose ของทุกข้อ และเมนูที่เป็นของข้อเดียวเท่านั้น
 * ต้องไม่เกิน choose ของข้อนั้น (กันเรียก API ตรงเลือกเมนูครบทุกอย่างในราคาแพ็กเกจเดิม)
 */
export const menuQuotaViolation = (courses: CourseForQuota[], selectedNames: string[]): string | null => {
  const included = new Set(courses.filter((c) => c.choose === 0).flatMap((c) => c.items.map((i) => i.name)))
  const picks = [...new Set(selectedNames)].filter((n) => !included.has(n))
  const pickCourses = courses.filter((c) => c.choose > 0)

  const capacity = pickCourses.reduce((sum, c) => sum + c.choose, 0)
  if (picks.length > capacity) {
    return `เลือกเมนูเกินจำนวนที่แพ็กเกจกำหนด (เลือกได้ไม่เกิน ${capacity} อย่าง แต่เลือกมา ${picks.length} อย่าง)`
  }
  for (const course of pickCourses) {
    const names = new Set(course.items.map((i) => i.name))
    const onlyHere = picks.filter((n) => names.has(n) && pickCourses.every((o) => o === course || !o.items.some((i) => i.name === n)))
    if (onlyHere.length > course.choose) {
      return `เลือกเมนูในข้อ "${course.title ?? ''}" เกินจำนวนที่กำหนด (เลือกได้ ${course.choose} อย่าง)`
    }
  }
  return null
}

/** แนบสลิปซ้ำในใบจองเดิมได้ไม่ถี่กว่านี้ — ทุกครั้งที่แนบเรียก SlipOK ซึ่งกินโควตาที่ร้านจ่ายเงิน กันกดรัวๆ เผาโควตา */
export const SLIP_RESUBMIT_COOLDOWN_MS = 10_000

/** จำนวนครั้งสูงสุดที่แนบสลิปในใบจองเดียว (นับทุกครั้งที่แนบ) — เกินนี้ต้องติดต่อร้าน กันเผาโควตา SlipOK ที่ร้านจ่ายเงิน */
export const MAX_SLIP_ATTEMPTS = 10

export const todayInBangkok = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: BANGKOK, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

/** วันที่จัดงานย้อนหลัง (ก่อนวันนี้) ไม่ได้ — จองวันนี้ได้ */
export const isPastEventDate = (date: string, now: Date = new Date()): boolean => date < todayInBangkok(now)
