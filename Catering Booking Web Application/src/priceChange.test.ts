import { describe, expect, it } from 'vitest'
import { describePriceChange, type PriceSnapshot } from './priceChange'

const LABELS = { home: 'นครปฐม', metro: 'กรุงเทพ-ปริมณฑล', outside: 'นอกพื้นที่' }

const BASE: PriceSnapshot = { total: 20000, deliveryFee: 0, packagePrice: 10000, zone: 'home' }

describe('describePriceChange', () => {
  it('ยอดรวมและโซนไม่เปลี่ยน — ไม่ต้องแจ้ง', () => {
    expect(describePriceChange(BASE, { ...BASE }, LABELS)).toBeNull()
  })

  it('โซนเปลี่ยนเป็นนอกพื้นที่ ค่าเดินทางเพิ่ม — แจ้งทั้งโซนและค่าเดินทาง พร้อมยอดก่อน/หลัง', () => {
    const next: PriceSnapshot = { ...BASE, zone: 'outside', deliveryFee: 1200, total: 21200 }

    const change = describePriceChange(BASE, next, LABELS)

    expect(change).toEqual({
      from: 20000,
      to: 21200,
      reasons: [
        'สถานที่จัดงานเปลี่ยนโซนบริการ จาก "นครปฐม" เป็น "นอกพื้นที่"',
        'ค่าขนส่ง/ค่าเดินทางเปลี่ยนจาก 0 ฿ เป็น 1,200 ฿',
      ],
    })
  })

  it('ค่าเดินทางเปลี่ยนแต่โซนเดิม (ตำแหน่งร้านขยับ ระยะทางเปลี่ยน) — แจ้งเฉพาะค่าเดินทาง', () => {
    const prev: PriceSnapshot = { ...BASE, zone: 'outside', deliveryFee: 1000, total: 21000 }
    const next: PriceSnapshot = { ...prev, deliveryFee: 1500, total: 21500 }

    const change = describePriceChange(prev, next, LABELS)

    expect(change?.reasons).toEqual(['ค่าขนส่ง/ค่าเดินทางเปลี่ยนจาก 1,000 ฿ เป็น 1,500 ฿'])
    expect(change?.from).toBe(21000)
    expect(change?.to).toBe(21500)
  })

  it('ราคาแพ็กเกจเปลี่ยน — แจ้งราคาต่อโต๊ะ', () => {
    const next: PriceSnapshot = { ...BASE, packagePrice: 11000, total: 22000 }

    expect(describePriceChange(BASE, next, LABELS)?.reasons).toEqual(['ราคาแพ็กเกจเปลี่ยนจาก 10,000 ฿ เป็น 11,000 ฿ ต่อโต๊ะ'])
  })

  it('โซนเปลี่ยนแต่ยอดรวมเท่าเดิม — ยังแจ้ง (ลูกค้าควรรู้ว่าโซนเปลี่ยน)', () => {
    const next: PriceSnapshot = { ...BASE, zone: 'metro' }

    const change = describePriceChange(BASE, next, LABELS)

    expect(change?.reasons).toEqual(['สถานที่จัดงานเปลี่ยนโซนบริการ จาก "นครปฐม" เป็น "กรุงเทพ-ปริมณฑล"'])
  })

  it('ยังไม่มีสถานที่ (zone เป็น null) — ไม่นับว่าโซนเปลี่ยน', () => {
    expect(describePriceChange({ ...BASE, zone: null }, { ...BASE, zone: 'outside' }, LABELS)).toBeNull()
  })
})
