import type { BookingData, Screen } from './types'

/** key ของ sessionStorage ที่เก็บข้อมูลจองที่กำลังเลือกอยู่ (ฉบับร่าง) — รีเฟรชหน้ากลางขั้นตอนแล้วข้อมูลต้องไม่หาย */
export const BOOKING_DRAFT_KEY = 'bookingDraft'

interface StoredDraft {
  shopId: string
  booking: BookingData
}

const getStorage = (): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null // เช่น private mode ที่เข้าถึง storage ไม่ได้
  }
}

/** วันนี้ในรูป YYYY-MM-DD ตามเวลาท้องถิ่น (รูปเดียวกับ booking.date) */
const todayKey = (now: Date): string => {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * อ่านฉบับร่างการจองที่เก็บไว้ — ใช้ได้เฉพาะของร้านเดียวกับที่เปิดอยู่ตอนนี้ (กันเอาข้อมูลร้านหนึ่งไปจองอีกร้าน)
 * ถ้าวันที่ที่เลือกไว้ผ่านไปแล้วให้ทิ้งวัน/เวลา (ต้องเลือกใหม่) ส่วนข้อมูลอื่นยังคงไว้ คืน fallback ถ้าไม่มี/อ่านไม่ได้
 */
export function loadBookingDraft(
  shopId: string | null,
  fallback: BookingData,
  storage = getStorage(),
  now = new Date(),
): BookingData {
  if (!shopId || !storage) return fallback
  try {
    const raw = storage.getItem(BOOKING_DRAFT_KEY)
    if (!raw) return fallback
    const stored = JSON.parse(raw) as StoredDraft
    if (stored.shopId !== shopId || typeof stored.booking !== 'object' || stored.booking === null) return fallback

    const booking: BookingData = { ...fallback, ...stored.booking }
    if (booking.date && booking.date < todayKey(now)) return { ...booking, date: null, timeSlot: null }
    return booking
  } catch {
    return fallback
  }
}

/** เก็บฉบับร่างลง sessionStorage — ถ้าเท่ากับค่าเริ่มต้น (ยังไม่ได้เลือกอะไร/เพิ่งจองเสร็จ) ให้ลบทิ้งแทน */
export function saveBookingDraft(
  shopId: string | null,
  booking: BookingData,
  initial: BookingData,
  storage = getStorage(),
): void {
  if (!storage) return
  try {
    if (!shopId || JSON.stringify(booking) === JSON.stringify(initial)) {
      storage.removeItem(BOOKING_DRAFT_KEY)
      return
    }
    storage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ shopId, booking } satisfies StoredDraft))
  } catch {
    // เพิกเฉยได้ (storage เต็ม/ใช้ไม่ได้) — แค่รีเฟรชแล้วข้อมูลจะไม่คงอยู่
  }
}

/** ลำดับขั้นตอนการจอง: เลือกวัน-เวลา → จำนวนโต๊ะ → สถานที่ → แพ็กเกจ → เมนู → สรุป */
const STEP_ORDER: Screen[] = ['booking-calendar', 'select-table', 'select-location', 'select-package', 'select-menu', 'cart']

/** ขั้นตอนนี้กรอกครบแล้วหรือยัง — จำนวนโต๊ะมีค่าเริ่มต้นเสมอ และเมนูเลือกต่อจากแพ็กเกจ จึงไม่ต้องเช็คสองขั้นนั้น */
const isStepComplete = (step: Screen, b: BookingData): boolean => {
  switch (step) {
    case 'booking-calendar':
      return !!b.date && !!b.timeSlot
    case 'select-location':
      return b.location !== null
    case 'select-package':
      return b.packageId !== null
    default:
      return true
  }
}

/**
 * หน้าที่ผู้ใช้ควรถูกพากลับไปเลือกก่อน ถ้าเปิดหน้า target ทั้งที่ขั้นก่อนหน้ายังไม่ครบ (เช่นรีเฟรชหรือพิมพ์ URL หน้า
 * สรุปตรงๆ) — คืนขั้นแรกสุดที่ยังขาด หรือ null ถ้าครบพร้อมแล้ว/target ไม่ใช่ขั้นตอนการจอง
 */
export function firstIncompleteStep(booking: BookingData, target: Screen): Screen | null {
  const targetIndex = STEP_ORDER.indexOf(target)
  if (targetIndex < 0) return null
  return STEP_ORDER.slice(0, targetIndex).find((step) => !isStepComplete(step, booking)) ?? null
}

/** ข้อความบอกว่าข้อมูลจองขาดอะไรก่อนกดยืนยัน — คืน null ถ้าครบ (ใช้เป็นตาข่ายสุดท้าย กันจองด้วยข้อมูลไม่ครบ) */
export function missingBookingField(booking: BookingData): string | null {
  if (!booking.date || !booking.timeSlot) return 'วันและเวลา'
  if (!booking.location) return 'สถานที่จัดงาน'
  if (!booking.packageId) return 'แพ็กเกจ'
  return null
}
