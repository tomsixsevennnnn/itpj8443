import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { UpdateSettingsDto } from './update-settings.dto'

const build = (extra: Record<string, unknown>) => plainToInstance(UpdateSettingsDto, { expectedVersion: 1, ...extra })

describe('UpdateSettingsDto — เลขบัญชี/พร้อมเพย์เป็นตัวเลขล้วน', () => {
  it('ตัดขีดคั่น/ช่องว่าง/ตัวอักษรออกจากเลขบัญชีและพร้อมเพย์ (หลักและเพิ่มเติม) แล้วผ่าน validate', async () => {
    const dto = build({
      bankAccountNumber: '123-4-56789-0',
      promptPayId: '081 234 5678',
      extraBankAccounts: [{ bankName: 'กสิกรไทย', accountNumber: '098-7-65432-1 ', accountName: 'ก' }],
      extraPromptPays: [{ id: '1-2345-67890-12-3', firstName: 'ก', lastName: 'ข' }],
    })
    expect(await validate(dto)).toHaveLength(0)
    expect(dto.bankAccountNumber).toBe('1234567890')
    expect(dto.promptPayId).toBe('0812345678')
    expect(dto.extraBankAccounts?.[0].accountNumber).toBe('0987654321')
    expect(dto.extraPromptPays?.[0].id).toBe('1234567890123')
  })

  it('ค่าว่างยังได้ (ลบบัญชีออก)', async () => {
    const dto = build({ bankAccountNumber: '', promptPayId: '' })
    expect(await validate(dto)).toHaveLength(0)
    expect(dto.bankAccountNumber).toBe('')
  })

  it('ไม่ส่งฟิลด์มา — ไม่เติมค่าให้ (ไม่ทับค่าเดิมตอน PATCH บางส่วน)', async () => {
    const dto = build({})
    expect(await validate(dto)).toHaveLength(0)
    expect(dto.bankAccountNumber).toBeUndefined()
    expect(dto.promptPayId).toBeUndefined()
  })
})

describe('UpdateSettingsDto — ชื่อบัญชี/ชื่อ-นามสกุลเป็นตัวอักษรล้วน', () => {
  it('ตัดตัวเลขและอักษรพิเศษออก คงอักษรไทย (สระ/วรรณยุกต์) อังกฤษ และช่องว่างระหว่างคำ แล้วผ่าน validate', async () => {
    const dto = build({
      bankAccountName: 'น.ส.  ชานน   อุณหะจิรังรักษ์ 123',
      promptPayFirstName: 'John-2',
      promptPayLastName: "O'Brien",
      extraBankAccounts: [{ bankName: 'กสิกรไทย', accountNumber: '1', accountName: '  สมชาย! ใจดี  ' }],
      extraPromptPays: [{ id: '1', firstName: 'ก๊อก@', lastName: 'ข#ค' }],
    })
    expect(await validate(dto)).toHaveLength(0)
    expect(dto.bankAccountName).toBe('นส ชานน อุณหะจิรังรักษ์')
    expect(dto.promptPayFirstName).toBe('John')
    expect(dto.promptPayLastName).toBe('OBrien')
    expect(dto.extraBankAccounts?.[0].accountName).toBe('สมชาย ใจดี')
    expect(dto.extraPromptPays?.[0].firstName).toBe('ก๊อก')
    expect(dto.extraPromptPays?.[0].lastName).toBe('ขค')
  })

  it('ไม่ส่งฟิลด์ชื่อมา — ไม่เติมค่าให้', async () => {
    const dto = build({})
    expect(dto.bankAccountName).toBeUndefined()
    expect(dto.promptPayFirstName).toBeUndefined()
  })
})
