import { describe, expect, it } from 'vitest'
import { MAX_NUMBER, clampInt, clampNumber, digitsOnly, isValidPhone, lettersOnly, lineIdOnly } from './inputRules'

describe('isValidPhone', () => {
  it('ตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0 เท่านั้น', () => {
    expect(isValidPhone('0812345678')).toBe(true)
    expect(isValidPhone('021234567')).toBe(true)
    expect(isValidPhone('0812')).toBe(false)
    expect(isValidPhone('812345678')).toBe(false)
    expect(isValidPhone('08123456789')).toBe(false)
    expect(isValidPhone('08123abc78')).toBe(false)
    expect(isValidPhone('')).toBe(false)
  })

  it('เบอร์ที่ผ่านการกรอง digitsOnly (วางมาพร้อมขีด/เว้นวรรค) ใช้ได้', () => {
    expect(isValidPhone(digitsOnly('081-234-5678'))).toBe(true)
  })
})

describe('lineIdOnly', () => {
  it('คงเฉพาะอักษรอังกฤษ ตัวเลข และ . _ - @', () => {
    expect(lineIdOnly('@som_chai.01-x')).toBe('@som_chai.01-x')
    expect(lineIdOnly('สมชาย som chai!#')).toBe('somchai')
    expect(lineIdOnly('')).toBe('')
  })
})

describe('clampInt / clampNumber', () => {
  it('ตัดให้อยู่ในช่วง min..เพดาน และปัดทศนิยมลงสำหรับ clampInt', () => {
    expect(clampInt('100', 0)).toBe(100)
    expect(clampInt('12.9', 0)).toBe(12)
    expect(clampInt('-5', 0)).toBe(0)
    expect(clampInt('999999', 0)).toBe(MAX_NUMBER)
    expect(clampInt(MAX_NUMBER, 0)).toBe(MAX_NUMBER)
  })

  it('ค่าว่าง/ไม่ใช่ตัวเลข ได้ค่าต่ำสุด', () => {
    expect(clampInt('', 1)).toBe(1)
    expect(clampInt('abc', 1)).toBe(1)
    expect(clampNumber('', 0)).toBe(0)
  })

  it('clampNumber คงทศนิยม แต่ตัดเพดาน', () => {
    expect(clampNumber('8.5', 0)).toBe(8.5)
    expect(clampNumber('99999', 0)).toBe(MAX_NUMBER)
    expect(clampNumber('-1', 0)).toBe(0)
  })
})

describe('lettersOnly (ชื่อลูกค้า)', () => {
  it('ตัดตัวเลขและอักษรพิเศษ คงสระ/วรรณยุกต์ไทย', () => {
    expect(lettersOnly('ก๊อก123')).toBe('ก๊อก')
    expect(lettersOnly('ใจ-ดี')).toBe('ใจดี')
  })
})
