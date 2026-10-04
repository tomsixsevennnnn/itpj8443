import { accountMatches, bankNameOf, matchReceiver, nameMatches, type SlipReceiver } from './receiver-match'

const RECEIVER: SlipReceiver = {
  displayName: 'ธนาทร ร',
  name: 'THANATORN R',
  account: 'xxx-x-x3109-x',
  proxy: '086xxx0000',
  bankCode: '004',
}

describe('nameMatches', () => {
  it('ชื่อเต็มของร้านตรงกับชื่อที่ SlipOK ย่อ (ชื่อ + อักษรแรกของนามสกุล) แม้มีคำนำหน้า', () => {
    expect(nameMatches('นาย ธนาทร รักดี', 'ธนาทร ร')).toBe(true)
    expect(nameMatches('ธนาทร รักดี', 'นายธนาทร ร')).toBe(true)
  })

  it('ชื่อภาษาอังกฤษ ไม่สนตัวพิมพ์ใหญ่-เล็กและจุด', () => {
    expect(nameMatches('Thanatorn Rakdee', 'THANATORN R')).toBe(true)
    expect(nameMatches('Mr. Thanatorn Rakdee', 'thanatorn r.')).toBe(true)
  })

  it('ชื่อต่างกัน หรือนามสกุลขึ้นต้นต่างกัน — ไม่ตรง', () => {
    expect(nameMatches('สมชาย ใจดี', 'ธนาทร ร')).toBe(false)
    expect(nameMatches('ธนาทร ใจดี', 'ธนาทร ร')).toBe(false)
  })

  it('ว่างเปล่า — ไม่ตรง', () => {
    expect(nameMatches('', 'ธนาทร ร')).toBe(false)
    expect(nameMatches('ธนาทร', '   ')).toBe(false)
  })
})

describe('accountMatches', () => {
  it('ตัว x ในเลขที่ปกปิดตรงกับเลขอะไรก็ได้ ส่วนเลขที่เห็นต้องตรงตำแหน่ง', () => {
    expect(accountMatches('123-4-53109-6', 'xxx-x-x3109-x')).toBe(true)
    expect(accountMatches('1234531096', 'xxx-x-x3109-x')).toBe(true)
  })

  it('เลขที่เห็นไม่ตรง — false', () => {
    expect(accountMatches('1234599996', 'xxx-x-x3109-x')).toBe(false)
  })

  it('พร้อมเพย์แบบเบอร์โทรที่ปกปิดกลาง', () => {
    expect(accountMatches('0861230000', '086xxx0000')).toBe(true)
    expect(accountMatches('0891230000', '086xxx0000')).toBe(false)
  })

  it('ความยาวต่างกันหรือไม่มีข้อมูล — เทียบไม่ได้ (null) ไม่ใช่ไม่ตรง', () => {
    expect(accountMatches('12345', 'xxx-x-x3109-x')).toBeNull()
    expect(accountMatches('', 'xxx-x-x3109-x')).toBeNull()
    expect(accountMatches('1234531096', '')).toBeNull()
  })
})

const ch = (names: string[], accounts: string[]) => ({ names, accounts })

describe('matchReceiver', () => {
  it('owner ยังไม่ได้ตั้งบัญชี — ไม่ได้เทียบ (checked=false) แต่ไม่ปฏิเสธ', () => {
    expect(matchReceiver(RECEIVER, { channels: [] })).toEqual({ checked: false, ok: true, reasons: [] })
    expect(matchReceiver(RECEIVER, { channels: [ch([], []), ch(['  '], [''])] })).toEqual({ checked: false, ok: true, reasons: [] })
  })

  it('บัญชีเดียว: ชื่อและเลขตรงทั้งคู่ — ok', () => {
    const result = matchReceiver(RECEIVER, { channels: [ch(['ธนาทร รักดี'], ['1234531096'])] })
    expect(result).toEqual({ checked: true, ok: true, reasons: [] })
  })

  it('บัญชีเดียว: ชื่อไม่ตรง — ไม่ ok พร้อมเหตุผล', () => {
    const result = matchReceiver(RECEIVER, { channels: [ch(['สมชาย ใจดี'], [])] })
    expect(result.ok).toBe(false)
    expect(result.reasons[0]).toContain('ชื่อผู้รับ')
  })

  it('บัญชีเดียว: เลขบัญชีไม่ตรง — ไม่ ok', () => {
    const result = matchReceiver(RECEIVER, { channels: [ch([], ['9999999999'])] })
    expect(result.ok).toBe(false)
    expect(result.reasons[0]).toContain('เลขบัญชี')
  })

  it('ธนาคารเดียวกัน 2 บัญชีคนละชื่อ (A และ B) — ผู้รับเป็นบัญชี B ผ่าน เพราะตรงกับบัญชีใดบัญชีหนึ่ง', () => {
    const expected = { channels: [ch(['สมชาย ใจดี'], ['9999999999']), ch(['ธนาทร รักดี'], ['1234531096'])] }
    expect(matchReceiver(RECEIVER, expected)).toEqual({ checked: true, ok: true, reasons: [] })
  })

  it('ชื่อของบัญชี B แต่เลขของบัญชี A (ข้ามบัญชี) — ไม่ผ่าน เทียบต่อบัญชี ไม่ปนกัน', () => {
    const expected = { channels: [ch(['สมชาย ใจดี'], ['1234531096']), ch(['ธนาทร รักดี'], ['9999999999'])] }
    const result = matchReceiver(RECEIVER, expected)
    expect(result.ok).toBe(false)
    expect(result.reasons[0]).toContain('ไม่ตรงกับบัญชีรับเงินใดเลย')
  })

  it('พร้อมเพย์หลายรายการ + บัญชีธนาคาร — ผู้รับตรงกับพร้อมเพย์รายการที่สามก็ผ่าน', () => {
    const receiver: SlipReceiver = { displayName: 'ธนาทร ร', name: '', account: '', proxy: '086xxx0000', bankCode: '004' }
    const expected = {
      channels: [ch(['สมชาย ใจดี'], ['1234567890']), ch(['มานี มีตา'], ['0891110000']), ch(['ธนาทร รักดี'], ['0861230000'])],
    }
    expect(matchReceiver(receiver, expected).ok).toBe(true)
  })

  it('บัญชีที่ owner กรอกไม่ครบจนเทียบไม่ได้ (เช่นเลขสั้นเกิน) ปะปนกับบัญชีที่ไม่ตรง — ไม่ปฏิเสธ (ตัดทิ้งไม่ได้ว่าเป็นบัญชีนั้น)', () => {
    const expected = { channels: [ch([], ['12345']), ch(['สมชาย ใจดี'], [])] }
    expect(matchReceiver(RECEIVER, expected)).toEqual({ checked: false, ok: true, reasons: [] })
  })

  it('สลิปไม่มีข้อมูลผู้รับ — ไม่นับเป็นไม่ตรง', () => {
    const empty: SlipReceiver = { displayName: '', name: '', account: '', proxy: '', bankCode: '' }
    expect(matchReceiver(empty, { channels: [ch(['ธนาทร รักดี'], ['1234531096'])] })).toEqual({ checked: false, ok: true, reasons: [] })
  })
})

describe('bankNameOf', () => {
  it('รหัสที่รู้จักคืนชื่อธนาคาร (รวม EXIM และ SME D Bank ที่ SlipOK รองรับ) ไม่รู้จักคืนรหัสเดิม', () => {
    expect(bankNameOf('004')).toBe('ธนาคารกสิกรไทย')
    expect(bankNameOf('035')).toContain('EXIM')
    expect(bankNameOf('098')).toContain('SME')
    expect(bankNameOf('999')).toBe('999')
  })
})
