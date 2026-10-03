import { describe, expect, it } from 'vitest'
import { DEFAULT_HOME_PROVINCE, DEFAULT_METRO_PROVINCES } from './geo'
import { THAI_PROVINCES } from './provinces'

describe('THAI_PROVINCES', () => {
  it('ครบ 77 จังหวัด ไม่ซ้ำกัน', () => {
    expect(THAI_PROVINCES).toHaveLength(77)
    expect(new Set(THAI_PROVINCES).size).toBe(77)
  })

  it('ชื่อจังหวัดเริ่มต้นของร้าน (ค่า default) อยู่ในรายการ — สะกดตรงกัน เลือกจาก autocomplete ได้', () => {
    expect(THAI_PROVINCES).toContain(DEFAULT_HOME_PROVINCE)
    for (const p of DEFAULT_METRO_PROVINCES) expect(THAI_PROVINCES).toContain(p)
  })
})
