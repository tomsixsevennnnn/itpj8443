import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateBookingDto } from './create-booking.dto'

const validPayload = {
  date: '2026-01-15',
  timeSlot: 'เย็น (17:00-21:00)',
  tables: 5,
  guestCount: 50,
  // ราคา/ชื่อแพ็กเกจไม่รับจาก client แล้ว (backend คำนวณเองจาก packageId กันปลอมราคา — ดู BookingsService.create)
  packageId: 'pkg_test123',
  location: 'ทดสอบ',
  menus: ['เมนู 1'],
}

describe('CreateBookingDto', () => {
  it('ผ่าน validation เมื่อข้อมูลครบถ้วนถูกต้อง', async () => {
    const dto = plainToInstance(CreateBookingDto, validPayload)
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('ไม่ผ่านถ้าขาดฟิลด์จำเป็น', async () => {
    const { date: _date, ...rest } = validPayload
    const dto = plainToInstance(CreateBookingDto, rest)
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'date')).toBe(true)
  })

  it('ไม่ผ่านถ้าจำนวนโต๊ะน้อยกว่า 1', async () => {
    const dto = plainToInstance(CreateBookingDto, { ...validPayload, tables: 0 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'tables')).toBe(true)
  })

  it('ไม่มี lineId ได้ (optional field)', async () => {
    const dto = plainToInstance(CreateBookingDto, validPayload)
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })
})
