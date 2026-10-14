/**
 * กฎกรอกข้อมูลฝั่งหน้าจอ — ตัดอักขระที่ไม่อนุญาตทันทีที่พิมพ์/วาง (ความสะดวกของผู้ใช้) ต้องตรงกับ backend
 * `src/common/input-rules.ts` ที่ตรวจซ้ำเสมอ (ความปลอดภัย เพราะเรียก API ตรงข้ามหน้าจอได้)
 */

/** เพดานของตัวเลขที่ไม่มีเพดานตามธรรมชาติ (จำนวนแขก ราคา ค่าขนส่ง ค่าน้ำมัน วันยืนราคา) */
export const MAX_NUMBER = 50000

/** ความยาวสูงสุดของข้อความอิสระ — ต้องตรงกับ @MaxLength ใน DTO ของ backend */
export const TEXT_LIMITS = {
  personName: 50,
  lineId: 30,
  shopName: 100,
  shopInitials: 10,
  shopAddress: 300,
  shopTagline: 150,
  menuName: 100,
  description: 1000,
  packageName: 100,
  badge: 30,
  feature: 200,
  courseTitle: 100,
  term: 500,
  locationShort: 100,
  locationNote: 300,
} as const

/** เก็บเฉพาะตัวเลข — ตัดขีดคั่น ช่องว่าง และตัวอักษรออก (เลขบัญชี เลขพร้อมเพย์ เบอร์โทร) */
export const digitsOnly = (value: string): string => value.replace(/\D/g, '')

/** ชื่อบัญชี/ชื่อ-นามสกุลกรอกได้เฉพาะตัวอักษร (ไทย/อังกฤษ/ภาษาอื่น รวมสระและวรรณยุกต์) กับช่องว่าง — ตัดตัวเลขและอักษรพิเศษออก
 *  (ไม่ trim ระหว่างพิมพ์ เพราะต้องพิมพ์เว้นวรรคระหว่างคำได้ — backend จัดช่องว่างซ้ำ/หัวท้ายให้ตอนบันทึก) */
export const lettersOnly = (value: string): string => value.replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s{2,}/g, ' ')

/** Line ID: ตัวอักษรอังกฤษ ตัวเลข และ . _ - @ เท่านั้น */
export const lineIdOnly = (value: string): string => value.replace(/[^A-Za-z0-9._@-]/g, '')

/** เบอร์โทรไทย: ตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0 (มือถือ 10 หลัก เบอร์บ้านรวมรหัสจังหวัด 9 หลัก) */
export const isValidPhone = (value: string): boolean => /^0\d{8,9}$/.test(value)

/** ตัวเลขจำนวนเต็มที่ถูกจำกัดช่วง (ค่าว่าง/ไม่ใช่ตัวเลข = min) — ใช้กับช่องที่มีเพดาน */
export const clampInt = (raw: string | number, min: number, max: number = MAX_NUMBER): number => {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/** เหมือน clampInt แต่ทศนิยมได้ (ค่าน้ำมัน/กม.) */
export const clampNumber = (raw: string | number, min: number, max: number = MAX_NUMBER): number => {
  const n = Number(raw)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}
