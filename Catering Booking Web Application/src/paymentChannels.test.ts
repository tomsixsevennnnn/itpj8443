import { describe, expect, it } from 'vitest'
import { bankAccountsOf, bankChannelKey, channelKeysOf, hasPaymentChannel, promptPayChannelKey, promptPaysOf } from './paymentChannels'

const EMPTY = {
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  promptPayId: '',
  promptPayFirstName: '',
  promptPayLastName: '',
  extraBankAccounts: [],
  extraPromptPays: [],
}

describe('bankAccountsOf', () => {
  it('ไม่มีบัญชีเลย — ว่าง', () => {
    expect(bankAccountsOf(EMPTY)).toEqual([])
    expect(hasPaymentChannel(EMPTY)).toBe(false)
  })

  it('บัญชีหลักอย่างเดียว', () => {
    const info = { ...EMPTY, bankName: 'ธนาคารกสิกรไทย', bankAccountNumber: '123', bankAccountName: 'ก' }
    expect(bankAccountsOf(info)).toEqual([{ bankName: 'ธนาคารกสิกรไทย', accountNumber: '123', accountName: 'ก' }])
  })

  it('ธนาคารเดียวกัน 2 บัญชีคนละชื่อ — แสดงทั้งสองบัญชี หลักก่อน', () => {
    const info = {
      ...EMPTY,
      bankName: 'ธนาคารกสิกรไทย',
      bankAccountNumber: '111',
      bankAccountName: 'A',
      extraBankAccounts: [{ bankName: 'ธนาคารกสิกรไทย', accountNumber: '222', accountName: 'B' }],
    }
    expect(bankAccountsOf(info).map(a => [a.accountName, a.accountNumber])).toEqual([
      ['A', '111'],
      ['B', '222'],
    ])
  })

  it('ไม่มีบัญชีหลักแต่มีบัญชีเพิ่มเติม — แสดงเฉพาะบัญชีเพิ่มเติม และตัดรายการที่ไม่มีเลขบัญชีทิ้ง', () => {
    const info = {
      ...EMPTY,
      extraBankAccounts: [
        { bankName: 'ธนาคารกรุงไทย', accountNumber: '333', accountName: 'C' },
        { bankName: 'ธนาคารกรุงไทย', accountNumber: '  ', accountName: 'ไม่มีเลข' },
      ],
    }
    expect(bankAccountsOf(info)).toEqual([{ bankName: 'ธนาคารกรุงไทย', accountNumber: '333', accountName: 'C' }])
    expect(hasPaymentChannel(info)).toBe(true)
  })
})

describe('promptPaysOf', () => {
  it('หลัก + เพิ่มเติม หลักก่อน ตัดรายการที่ไม่มีเลขทิ้ง', () => {
    const info = {
      ...EMPTY,
      promptPayId: '0861230000',
      promptPayFirstName: 'พีรณัฐ',
      promptPayLastName: 'ทุ่งศรีแก้ว',
      extraPromptPays: [
        { id: '0891110000', firstName: 'มานี', lastName: 'มีตา' },
        { id: '', firstName: 'ว่าง', lastName: '' },
      ],
    }
    expect(promptPaysOf(info).map(p => p.id)).toEqual(['0861230000', '0891110000'])
  })

  it('มีแค่พร้อมเพย์ — hasPaymentChannel เป็น true', () => {
    expect(hasPaymentChannel({ ...EMPTY, promptPayId: '0861230000' })).toBe(true)
  })
})

describe('channel keys (ตรงกับที่ backend สร้าง)', () => {
  it('key ใช้เฉพาะตัวเลขของเลขบัญชี/พร้อมเพย์ (ตัดขีดและช่องว่าง)', () => {
    expect(bankChannelKey('123-4-53109-6')).toBe('bank:1234531096')
    expect(promptPayChannelKey('086 123 0000')).toBe('pp:0861230000')
  })

  it('เลขน้อยกว่า 4 หลัก — ไม่มี key (เลือกไม่ได้)', () => {
    expect(bankChannelKey('12-3')).toBeNull()
    expect(promptPayChannelKey('')).toBeNull()
  })

  it('channelKeysOf: ธนาคารทั้งหมดก่อน แล้วพร้อมเพย์ทั้งหมด ตามลำดับที่แสดงให้ลูกค้า', () => {
    const info = {
      ...EMPTY,
      bankName: 'ธนาคารกสิกรไทย',
      bankAccountNumber: '111-1-11111-1',
      extraBankAccounts: [{ bankName: 'ธนาคารกรุงไทย', accountNumber: '222-2-22222-2', accountName: 'B' }],
      promptPayId: '0861230000',
      extraPromptPays: [{ id: '0891110000', firstName: 'ก', lastName: 'ข' }],
    }
    expect(channelKeysOf(info)).toEqual(['bank:1111111111', 'bank:2222222222', 'pp:0861230000', 'pp:0891110000'])
  })
})
