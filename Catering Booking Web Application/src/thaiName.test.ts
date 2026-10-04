import { describe, expect, it } from 'vitest'
import { accountMatches, nameMatches } from './receiverMatch'
import { joinName, splitName } from './thaiName'
import { THAI_BANK_NAMES, bankBrandOf, bankCodeOfName, bankNameOf } from './banks'

describe('splitName / joinName', () => {
  it('ตัดคำนำหน้า แยกคำแรกเป็นชื่อ ที่เหลือเป็นนามสกุล', () => {
    expect(splitName('นายพิพัฒน์ โภชนา')).toEqual({ first: 'พิพัฒน์', last: 'โภชนา' })
    expect(splitName('นางสาว สมหญิง ใจดี มีสุข')).toEqual({ first: 'สมหญิง', last: 'ใจดี มีสุข' })
    expect(splitName('พีรณัฐ ทุ่งศรีแก้ว')).toEqual({ first: 'พีรณัฐ', last: 'ทุ่งศรีแก้ว' })
  })

  it('ชื่อคำเดียว/ว่าง', () => {
    expect(splitName('พิพัฒน์')).toEqual({ first: 'พิพัฒน์', last: '' })
    expect(splitName('  ')).toEqual({ first: '', last: '' })
  })

  it('joinName ตัดช่องว่างและข้ามส่วนที่ว่าง', () => {
    expect(joinName(' พีรณัฐ ', ' ทุ่งศรีแก้ว ')).toBe('พีรณัฐ ทุ่งศรีแก้ว')
    expect(joinName('พีรณัฐ', '')).toBe('พีรณัฐ')
    expect(joinName('', '')).toBe('')
  })
})

describe('receiverMatch (ฝั่งหน้าจอ — ตรรกะเดียวกับ backend)', () => {
  it('nameMatches: ชื่อเต็มตรงกับชื่อที่ SlipOK ย่อ', () => {
    expect(nameMatches('นาย ธนาทร รักดี', 'ธนาทร ร')).toBe(true)
    expect(nameMatches('สมชาย ใจดี', 'ธนาทร ร')).toBe(false)
  })

  it('accountMatches: ตัว x ตรงกับเลขอะไรก็ได้ ความยาวต่างกัน = เทียบไม่ได้', () => {
    expect(accountMatches('123-4-53109-6', 'xxx-x-x3109-x')).toBe(true)
    expect(accountMatches('1234599996', 'xxx-x-x3109-x')).toBe(false)
    expect(accountMatches('12345', 'xxx-x-x3109-x')).toBeNull()
  })
})

describe('banks (ป้ายสัญลักษณ์ธนาคาร)', () => {
  it('ทุกธนาคารในรายการมีป้ายสัญลักษณ์ (อักษรย่อ + สี) และแปลงชื่อ↔รหัสได้', () => {
    for (const name of THAI_BANK_NAMES) {
      const code = bankCodeOfName(name)
      expect(code).not.toBeNull()
      expect(bankNameOf(code as string)).toBe(name)
      expect(bankBrandOf(name)?.abbr).toBeTruthy()
      expect(bankBrandOf(code as string)).toEqual(bankBrandOf(name))
    }
  })

  it('ชื่อ/รหัสที่ไม่รู้จัก — ไม่มีป้าย (null)', () => {
    expect(bankBrandOf('ธนาคารที่ไม่มีจริง')).toBeNull()
    expect(bankBrandOf('999')).toBeNull()
    expect(bankBrandOf('')).toBeNull()
  })
})
