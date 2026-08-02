import type { Booking, ShopInfo } from './types'

/** ข้อมูลร้านเริ่มต้น — แก้ไขได้จริงจากหน้า "ตั้งค่า" ฝั่งร้าน (ค่านี้ใช้เป็นค่าเริ่มต้นของ AppSettings) */
export const DEFAULT_SHOP_INFO: ShopInfo = {
  name: 'ร้านพิพัฒน์โภชนา',
  nameEn: 'Pipat Phochana Catering',
  initials: 'PP',
  address: 'อ.เมืองนครปฐม จ.นครปฐม 73000',
  phone: '034-XXX-XXX',
  line: '@pipatphochana',
}

export type DocType = 'quotation' | 'booking'

export const DOC_LABEL: Record<DocType, string> = {
  quotation: 'ใบเสนอราคา',
  booking: 'ใบจอง',
}

/** เลขที่เอกสาร — ใบเสนอราคาใช้ QT- นำหน้า ส่วนใบจองใช้เลขที่จองเดิม */
export const docNumber = (booking: Booking, type: DocType): string =>
  type === 'quotation' ? `QT-${booking.id.split('-').slice(1).join('-')}` : booking.id

export const formatThaiDate = (iso: string, long = false): string =>
  new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(
    'th-TH',
    long
      ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' }
  )

/** ใบเสนอราคามีอายุ 7 วันนับจากวันที่ออก */
export const quotationValidUntil = (from = new Date()): string => {
  const d = new Date(from)
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

/* ------------------------------------------------------------------ *
 * สรุปราคา — ยอดค่าอาหาร + ค่าขนส่ง = ยอดรวมเสมอ (ร้านไม่คิด VAT/ค่าบริการ)
 * ------------------------------------------------------------------ */
export interface BookingPricing {
  pricePerTable: number
  subtotal: number
  deliveryFee: number
  total: number
  deposit: number
  remaining: number
}

/** อัตรามัดจำเริ่มต้นที่ต้องชำระเพื่อยืนยันการจอง ส่วนที่เหลือชำระในวันจัดงาน — แก้ไขได้จากหน้า "ตั้งค่า" */
export const DEFAULT_DEPOSIT_RATE = 0.5

export const bookingPricing = (b: Booking, depositRate: number = DEFAULT_DEPOSIT_RATE): BookingPricing => {
  const deliveryFee = b.deliveryFee ?? 0
  const subtotal = b.totalPrice - deliveryFee
  const pricePerTable = b.pricePerTable ?? Math.round(subtotal / Math.max(1, b.tables))
  const total = b.totalPrice
  const deposit = Math.round(total * depositRate)
  return { pricePerTable, subtotal, deliveryFee, total, deposit, remaining: total - deposit }
}

/* ------------------------------------------------------------------ *
 * จำนวนเงินเป็นตัวอักษร (บาทตัวอักษร)
 * ------------------------------------------------------------------ */
const THAI_DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

const readInteger = (n: number): string => {
  if (n === 0) return 'ศูนย์'
  if (n >= 1_000_000) {
    const head = Math.floor(n / 1_000_000)
    const tail = n % 1_000_000
    return `${readInteger(head)}ล้าน${tail > 0 ? readInteger(tail) : ''}`
  }

  const digits = String(n)
  let out = ''
  for (let i = 0; i < digits.length; i++) {
    const digit = Number(digits[i])
    const pos = digits.length - i - 1
    if (digit === 0) continue
    if (pos === 0 && digit === 1 && digits.length > 1) out += 'เอ็ด'
    else if (pos === 1 && digit === 1) out += 'สิบ'
    else if (pos === 1 && digit === 2) out += 'ยี่สิบ'
    else out += THAI_DIGITS[digit] + THAI_UNITS[pos]
  }
  return out
}

/** แปลงจำนวนเงินเป็นข้อความ เช่น 16,050 → "หนึ่งหมื่นหกพันห้าสิบบาทถ้วน" */
export const bahtText = (amount: number): string => {
  const safe = Math.max(0, Math.round(amount * 100) / 100)
  const baht = Math.floor(safe)
  const satang = Math.round((safe - baht) * 100)
  const head = `${readInteger(baht)}บาท`
  return satang === 0 ? `${head}ถ้วน` : `${head}${readInteger(satang)}สตางค์`
}
