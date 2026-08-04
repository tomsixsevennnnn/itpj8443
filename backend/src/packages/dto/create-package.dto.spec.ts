import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreatePackageDto } from './create-package.dto'

const validPayload = {
  name: 'โต๊ะจีน 2,000',
  pricePerTable: 2000,
  menuLimit: 9,
  courses: [{ no: 1, title: 'ของทานเล่น', category: 'snack', choose: 0, itemIds: ['dish-1'] }],
}

describe('CreatePackageDto', () => {
  it('ผ่าน validation เมื่อข้อมูลครบถ้วน', async () => {
    const dto = plainToInstance(CreatePackageDto, validPayload)
    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('ตรวจ nested validation ของแต่ละ course ด้วย (ValidateNested)', async () => {
    const invalid = { ...validPayload, courses: [{ no: 1, title: 'x' }] } // ขาด category/choose/itemIds
    const dto = plainToInstance(CreatePackageDto, invalid)
    const errors = await validate(dto)
    const courseErrors = errors.find((e) => e.property === 'courses')
    expect(courseErrors).toBeDefined()
  })

  it('ราคาต่อโต๊ะติดลบไม่ผ่าน', async () => {
    const dto = plainToInstance(CreatePackageDto, { ...validPayload, pricePerTable: -100 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'pricePerTable')).toBe(true)
  })

  it('menuLimit ต้องอย่างน้อย 1', async () => {
    const dto = plainToInstance(CreatePackageDto, { ...validPayload, menuLimit: 0 })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'menuLimit')).toBe(true)
  })
})
