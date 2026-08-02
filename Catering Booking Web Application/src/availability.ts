import type { Booking } from './types'

/* ------------------------------------------------------------------ *
 * สถานะคิวงานของแต่ละวัน — คำนวณจากรายการจองจริง
 * ------------------------------------------------------------------ */

export interface TimeSlotDef {
  id: SlotId
  label: string
  time: string
  icon: string
}

export type SlotId = 'morning' | 'noon' | 'evening' | 'allday'
/** ช่วงเวลาจริงที่ใช้นับคิว (ทั้งวัน = กินทั้ง 3 ช่วง) */
export type BaseSlotId = Exclude<SlotId, 'allday'>

export const TIME_SLOTS: TimeSlotDef[] = [
  { id: 'morning', label: 'ช่วงเช้า', time: '08:00 - 12:00', icon: '🌅' },
  { id: 'noon', label: 'ช่วงกลางวัน', time: '12:00 - 16:00', icon: '☀️' },
  { id: 'evening', label: 'ช่วงเย็น', time: '17:00 - 21:00', icon: '🌆' },
  { id: 'allday', label: 'ทั้งวัน', time: '08:00 - 21:00', icon: '📆' },
]

export const BASE_SLOTS: BaseSlotId[] = ['morning', 'noon', 'evening']

/** ช่วงเวลาที่ให้ลูกค้าเลือกได้จริง (ไม่มีตัวเลือก "ทั้งวัน") */
export const BOOKABLE_SLOTS: TimeSlotDef[] = TIME_SLOTS.filter(s => s.id !== 'allday')

/** จำนวนโต๊ะสูงสุดที่ร้านรับได้ต่อ 1 ช่วงเวลา (เท่ากับจำนวนโต๊ะสูงสุดที่จองได้ 1 งาน) */
export const SLOT_CAPACITY = 500

/** ใบจองที่ยังกินคิวอยู่ (ยกเลิกแล้วไม่นับ) */
const OCCUPIES_QUEUE: Booking['status'][] = ['pending', 'confirmed', 'completed']

/** แปลงข้อความช่วงเวลาในใบจองกลับเป็นรหัสช่วง */
export const slotIdOf = (timeSlot: string): SlotId => {
  if (timeSlot.includes('ทั้งวัน')) return 'allday'
  if (timeSlot.includes('เช้า')) return 'morning'
  if (timeSlot.includes('กลางวัน')) return 'noon'
  if (timeSlot.includes('เย็น')) return 'evening'
  return 'allday'
}

export type SlotUsage = Record<BaseSlotId, number>

/** จำนวนโต๊ะที่ถูกจองไปแล้วในแต่ละช่วงของวันนั้น */
export const slotUsage = (bookings: Booking[], date: string): SlotUsage => {
  const usage: SlotUsage = { morning: 0, noon: 0, evening: 0 }
  for (const b of bookings) {
    if (b.date !== date || !OCCUPIES_QUEUE.includes(b.status)) continue
    const slot = slotIdOf(b.timeSlot)
    if (slot === 'allday') {
      usage.morning += b.tables
      usage.noon += b.tables
      usage.evening += b.tables
    } else {
      usage[slot] += b.tables
    }
  }
  return usage
}

/** จำนวนโต๊ะที่ยังรับได้ในช่วงเวลานั้น */
export const remainingFor = (bookings: Booking[], date: string, slot: SlotId): number => {
  const usage = slotUsage(bookings, date)
  const used = slot === 'allday' ? Math.max(usage.morning, usage.noon, usage.evening) : usage[slot]
  return Math.max(0, SLOT_CAPACITY - used)
}

export type DayStatus = 'available' | 'full'

/** มีงานจองอยู่แล้วในวันนั้นหรือยัง — จองแล้ว 1 งาน (ช่วงใดก็ได้) ถือว่าเต็มทั้งวัน ไม่รับซ้อนช่วงอื่น */
export const dayStatus = (bookings: Booking[], date: string): DayStatus =>
  bookings.some(b => b.date === date && OCCUPIES_QUEUE.includes(b.status)) ? 'full' : 'available'

export const DAY_STATUS_INFO: Record<DayStatus, { label: string; dot: string; chip: string }> = {
  available: { label: 'ว่าง', dot: 'bg-green-400', chip: 'bg-green-100 text-green-700' },
  full: { label: 'เต็ม', dot: 'bg-red-400', chip: 'bg-red-100 text-red-600' },
}

export const BOOKING_STATUS_INFO: Record<
  Booking['status'],
  { label: string; dot: string; chip: string; border: string }
> = {
  pending: {
    label: 'รอยืนยัน',
    dot: 'bg-yellow-400',
    chip: 'bg-yellow-100 text-yellow-700',
    border: 'border-yellow-200',
  },
  confirmed: {
    label: 'ยืนยันแล้ว',
    dot: 'bg-green-400',
    chip: 'bg-green-100 text-green-700',
    border: 'border-green-200',
  },
  completed: {
    label: 'เสร็จสิ้น',
    dot: 'bg-gray-300',
    chip: 'bg-gray-100 text-gray-500',
    border: 'border-gray-200',
  },
  cancelled: {
    label: 'ยกเลิก',
    dot: 'bg-red-400',
    chip: 'bg-red-100 text-red-600',
    border: 'border-red-200',
  },
}

/** งานทั้งหมดของวันนั้น เรียงตามช่วงเวลา */
export const bookingsOn = (bookings: Booking[], date: string): Booking[] => {
  const order: Record<SlotId, number> = { morning: 0, noon: 1, evening: 2, allday: 3 }
  return bookings
    .filter(b => b.date === date)
    .sort((a, b) => order[slotIdOf(a.timeSlot)] - order[slotIdOf(b.timeSlot)])
}

export const toDateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
