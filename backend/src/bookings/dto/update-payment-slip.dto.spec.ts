import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { UpdatePaymentSlipDto } from './update-payment-slip.dto'

describe('UpdatePaymentSlipDto', () => {
  it('ผ่าน validation เมื่อเป็น path จาก POST /uploads/payment-slip', async () => {
    const dto = plainToInstance(UpdatePaymentSlipDto, { paymentSlipUrl: '/uploads/slips/abc-123.jpg' })
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('ไม่ผ่านถ้าเป็น data URL แบบเก่า (ก่อนมี UploadsService)', async () => {
    const dto = plainToInstance(UpdatePaymentSlipDto, {
      paymentSlipUrl: 'data:image/png;base64,aGVsbG8=',
    })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'paymentSlipUrl')).toBe(true)
  })

  it('ไม่ผ่านถ้าเป็น path นอกโฟลเดอร์ slips', async () => {
    const dto = plainToInstance(UpdatePaymentSlipDto, { paymentSlipUrl: '/uploads/menus/abc-123.jpg' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'paymentSlipUrl')).toBe(true)
  })

  it('ไม่ผ่านถ้านามสกุลไฟล์ไม่ใช่รูปที่รองรับ', async () => {
    const dto = plainToInstance(UpdatePaymentSlipDto, { paymentSlipUrl: '/uploads/slips/abc-123.exe' })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'paymentSlipUrl')).toBe(true)
  })
})
