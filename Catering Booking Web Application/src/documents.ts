import type { Booking, ShopInfo } from './types'

/** ข้อมูลร้านเริ่มต้น — แก้ไขได้จริงจากหน้า "ตั้งค่า" ฝั่งร้าน (ค่านี้ใช้เป็นค่าเริ่มต้นของ AppSettings) */
export const DEFAULT_SHOP_INFO: ShopInfo = {
  name: 'ร้านพิพัฒน์โภชนา',
  nameEn: 'Pipat Phochana Catering',
  initials: 'PP',
  address: 'อ.เมืองนครปฐม จ.นครปฐม 73000',
  phone: '034-XXX-XXX',
  line: '@pipatphochana',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  promptPayQr: '',
  promptPayId: '',
  logo: '',
  loginTagline: 'ระบบจองจัดเลี้ยงนอกสถานที่',
}

export type DocType = 'quotation' | 'booking'

export const DOC_LABEL: Record<DocType, string> = {
  quotation: 'ใบเสนอราคา',
  booking: 'ใบจอง',
}

/** เลขที่เอกสาร — ใบเสนอราคาใช้ QT- นำหน้า ส่วนใบจองใช้เลขที่จองจริง BK-{ปี}-{เลขลำดับ} (คงที่ ไม่เปลี่ยนตาม id ฐานข้อมูล) */
export const docNumber = (booking: Booking, type: DocType): string =>
  type === 'quotation'
    ? `QT-${booking.id.slice(-8).toUpperCase()}`
    : `BK-${booking.bookingYear}-${String(booking.bookingNo).padStart(3, '0')}`

export const formatThaiDate = (iso: string, long = false): string =>
  new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(
    'th-TH',
    long
      ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' }
  )

/** ค่าเริ่มต้น (ก่อนเจ้าของร้านแก้ไข) — ใบเสนอราคามีอายุกี่วันนับจากวันที่ออก */
export const DEFAULT_QUOTATION_VALID_DAYS = 7

/** ใบเสนอราคามีอายุกี่วันนับจากวันที่ออก — เจ้าของร้านแก้ไขได้จากหน้า "ตั้งค่า" (AppSettings.quotationValidDays) */
export const quotationValidUntil = (from = new Date(), days: number = DEFAULT_QUOTATION_VALID_DAYS): string => {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** ค่าเริ่มต้น (ก่อนเจ้าของร้านแก้ไข) — เงื่อนไขเพิ่มเติมท้ายใบเสนอราคา/ใบจอง (นอกเหนือจากเงื่อนไขที่ระบบคำนวณให้อัตโนมัติ เช่น ยอดมัดจำ/ค่าขนส่ง) */
export const DEFAULT_QUOTATION_TERMS = ['ราคานี้รวมอุปกรณ์จัดเลี้ยง โต๊ะ เก้าอี้ และพนักงานเสิร์ฟแล้ว ไม่มีค่าบริการเพิ่ม']

export const DEFAULT_BOOKING_TERMS = [
  'ทีมงานจะเข้าพื้นที่ก่อนเวลาเริ่มงานอย่างน้อย 2 ชั่วโมง',
  'แจ้งเปลี่ยนแปลงเมนูหรือจำนวนโต๊ะล่วงหน้าอย่างน้อย 7 วัน',
  'ยกเลิกก่อนวันงานน้อยกว่า 7 วัน ขอสงวนสิทธิ์ไม่คืนเงินมัดจำ',
]

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
