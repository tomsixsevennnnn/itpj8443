import type { ServiceZone } from './types'

/** ตัวเลขที่ทำให้ยอดรวมของหน้าสรุปการจองเปลี่ยนได้ (ใช้เทียบ "ก่อน/หลัง" ตอนร้านแก้ค่าตั้งค่าระหว่างที่ลูกค้าค้างอยู่หน้านั้น) */
export interface PriceSnapshot {
  total: number
  deliveryFee: number
  packagePrice: number
  zone: ServiceZone | null
}

export interface PriceChange {
  /** ยอดรวมก่อนเปลี่ยน/หลังเปลี่ยน */
  from: number
  to: number
  /** สาเหตุเป็นข้อความพร้อมแสดง เช่น "ค่าขนส่งเปลี่ยนจาก 0 ฿ เป็น 1,200 ฿" */
  reasons: string[]
}

const baht = (n: number): string => `${n.toLocaleString()} ฿`

/**
 * บอกว่ายอดที่หน้าสรุปโชว์เปลี่ยนไปอย่างไร — คืน null ถ้ายอดรวมและโซนไม่เปลี่ยน (ไม่มีอะไรต้องแจ้งลูกค้า)
 * ใช้แจ้งลูกค้าเป็นพิเศษ ไม่ให้ยอดเปลี่ยนเงียบๆ ตอนร้านแก้ตำแหน่งร้าน/ค่าขนส่ง/ราคาแพ็กเกจระหว่างที่ลูกค้ากำลังจอง
 */
export function describePriceChange(
  prev: PriceSnapshot,
  next: PriceSnapshot,
  zoneLabels: Record<ServiceZone, string>,
): PriceChange | null {
  const zoneChanged = prev.zone !== null && next.zone !== null && prev.zone !== next.zone
  if (prev.total === next.total && !zoneChanged) return null

  const reasons: string[] = []
  if (zoneChanged) {
    reasons.push(`สถานที่จัดงานเปลี่ยนโซนบริการ จาก "${zoneLabels[prev.zone!]}" เป็น "${zoneLabels[next.zone!]}"`)
  }
  if (prev.deliveryFee !== next.deliveryFee) {
    reasons.push(`ค่าขนส่ง/ค่าเดินทางเปลี่ยนจาก ${baht(prev.deliveryFee)} เป็น ${baht(next.deliveryFee)}`)
  }
  if (prev.packagePrice !== next.packagePrice) {
    reasons.push(`ราคาแพ็กเกจเปลี่ยนจาก ${baht(prev.packagePrice)} เป็น ${baht(next.packagePrice)} ต่อโต๊ะ`)
  }
  return { from: prev.total, to: next.total, reasons }
}
