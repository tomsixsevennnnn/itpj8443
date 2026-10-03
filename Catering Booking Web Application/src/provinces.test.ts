import { describe, expect, it } from 'vitest'
import { DEFAULT_HOME_PROVINCE, DEFAULT_METRO_PROVINCES } from './geo'
import { THAI_PROVINCES, filterProvinces, splitMatch } from './provinces'

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

describe('filterProvinces', () => {
  it('ไม่ได้พิมพ์อะไร — แสดงทั้งหมด', () => {
    expect(filterProvinces('')).toHaveLength(77)
    expect(filterProvinces('   ')).toHaveLength(77)
  })

  it('พิมพ์ "ราช" — เจอราชบุรี (ขึ้นต้นด้วยคำที่พิมพ์) ก่อนจังหวัดที่มีคำนี้อยู่ตรงกลาง', () => {
    const result = filterProvinces('ราช')
    expect(result[0]).toBe('ราชบุรี')
    expect(result).toContain('นครราชสีมา')
    expect(result).toContain('อุบลราชธานี')
    expect(result.indexOf('ราชบุรี')).toBeLessThan(result.indexOf('นครราชสีมา'))
  })

  it('พิมพ์ไม่ตรงจังหวัดไหนเลย — ว่าง', () => {
    expect(filterProvinces('xyz')).toEqual([])
  })

  it('พิมพ์ชื่อเต็ม — เจอจังหวัดนั้น', () => {
    expect(filterProvinces('นครปฐม')).toEqual(['นครปฐม'])
  })
})

describe('splitMatch', () => {
  it('แยกส่วนที่ตรงไว้ไฮไลต์', () => {
    expect(splitMatch('นครราชสีมา', 'ราช')).toEqual(['นคร', 'ราช', 'สีมา'])
    expect(splitMatch('ราชบุรี', 'ราช')).toEqual(['', 'ราช', 'บุรี'])
  })

  it('ไม่ได้พิมพ์/ไม่ตรง — ไม่ไฮไลต์อะไร', () => {
    expect(splitMatch('ราชบุรี', '')).toEqual(['ราชบุรี', '', ''])
    expect(splitMatch('ราชบุรี', 'xyz')).toEqual(['ราชบุรี', '', ''])
  })
})
