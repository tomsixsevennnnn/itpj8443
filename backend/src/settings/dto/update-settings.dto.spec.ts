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
