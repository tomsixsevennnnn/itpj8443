import { describe, expect, it } from 'vitest'
import { checkDelivery, deliveryFeeFor, zoneFor } from './geo'

describe('zoneFor', () => {
  it('นครปฐม = พื้นที่ร้าน', () => {
    expect(zoneFor('นครปฐม')).toBe('home')
  })

  it('กรุงเทพและปริมณฑล = metro', () => {
    expect(zoneFor('กรุงเทพมหานคร')).toBe('metro')
    expect(zoneFor('นนทบุรี')).toBe('metro')
  })

  it('จังหวัดที่ติดกับนครปฐม = metro', () => {
    expect(zoneFor('สุพรรณบุรี')).toBe('metro')
    expect(zoneFor('ราชบุรี')).toBe('metro')
    expect(zoneFor('กาญจนบุรี')).toBe('metro')
    expect(zoneFor('สมุทรสงคราม')).toBe('metro')
  })

  it('จังหวัดอื่น = นอกพื้นที่', () => {
    expect(zoneFor('เชียงใหม่')).toBe('outside')
  })

  it('เช็คจากที่อยู่เต็มถ้าชื่อจังหวัดไม่ตรง', () => {
    expect(zoneFor('', 'ถนนสุขุมวิท กรุงเทพมหานคร 10110')).toBe('metro')
  })
})

describe('deliveryFeeFor', () => {
  it('พื้นที่ร้าน (home) ไม่มีค่าขนส่งไม่ว่ากี่โต๊ะ', () => {
    expect(deliveryFeeFor(1, { zone: 'home' }, 2000, 30)).toBe(0)
    expect(deliveryFeeFor(500, { zone: 'home' }, 2000, 30)).toBe(0)
  })

  it('metro ไม่ถึงขั้นต่ำ = คิดค่าขนส่ง', () => {
    expect(deliveryFeeFor(10, { zone: 'metro' }, 2000, 30)).toBe(2000)
  })

  it('metro ถึงขั้นต่ำ = ไม่คิดค่าขนส่ง', () => {
    expect(deliveryFeeFor(30, { zone: 'metro' }, 2000, 30)).toBe(0)
  })

  it('นอกพื้นที่ ยังไม่รู้ระยะทาง = ยังไม่คิดค่าเดินทาง', () => {
    expect(deliveryFeeFor(10, { zone: 'outside' }, 2000, 30, 8)).toBe(0)
  })

  it('นอกพื้นที่ รู้ระยะทางแล้ว = คิดค่าเดินทางไป-กลับ (ระยะทาง×2) คูณค่าน้ำมัน/กม.', () => {
    expect(deliveryFeeFor(10, { zone: 'outside', distanceKm: 50 }, 2000, 30, 8)).toBe(800)
  })

  it('นอกพื้นที่ ไม่ว่าจำนวนโต๊ะเท่าไหร่ก็คิดตามระยะทางเหมือนกัน (ไม่มีขั้นต่ำ)', () => {
    expect(deliveryFeeFor(1, { zone: 'outside', distanceKm: 50 }, 2000, 30, 8)).toBe(800)
    expect(deliveryFeeFor(100, { zone: 'outside', distanceKm: 50 }, 2000, 30, 8)).toBe(800)
  })

  it('ไม่มีสถานที่ = ไม่คิดค่าขนส่ง', () => {
    expect(deliveryFeeFor(10, null, 2000, 30)).toBe(0)
  })
})

describe('checkDelivery', () => {
  it('นอกพื้นที่ ไม่บล็อกไม่ว่าจำนวนโต๊ะเท่าไหร่ (ไม่มีขั้นต่ำ)', () => {
    const result = checkDelivery(1, 'outside', 2000, 30)
    expect(result.blocked).toBe(false)
  })

  it('นอกพื้นที่ ยังไม่รู้ระยะทาง = แจ้งว่ากำลังคำนวณ ยังไม่คิดค่าเดินทาง', () => {
    const result = checkDelivery(10, 'outside', 2000, 30)
    expect(result.blocked).toBe(false)
    expect(result.fee).toBe(0)
    expect(result.tone).toBe('info')
  })

  it('นอกพื้นที่ คำนวณระยะทางได้แล้ว = คิดค่าเดินทางไป-กลับ × ค่าน้ำมัน/กม.', () => {
    const result = checkDelivery(10, 'outside', 2000, 30, { distanceKm: 50, fuelCostPerKm: 8 })
    expect(result.blocked).toBe(false)
    expect(result.fee).toBe(800)
    expect(result.tone).toBe('fee')
  })

  it('นอกพื้นที่ คำนวณระยะทางไม่สำเร็จ = ไม่บล็อก แจ้งทีมงานติดต่อกลับ', () => {
    const result = checkDelivery(10, 'outside', 2000, 30, { distanceKm: null, fuelCostPerKm: 8 })
    expect(result.blocked).toBe(false)
    expect(result.fee).toBe(0)
    expect(result.tone).toBe('info')
  })

  it('metro ไม่ถึงขั้นต่ำ = มีค่าขนส่งแต่จองได้', () => {
    const result = checkDelivery(10, 'metro', 2000, 30)
    expect(result.blocked).toBe(false)
    expect(result.fee).toBe(2000)
    expect(result.tone).toBe('fee')
  })

  it('พื้นที่ร้าน = ok เสมอ', () => {
    const result = checkDelivery(1, 'home', 2000, 30)
    expect(result.blocked).toBe(false)
    expect(result.fee).toBe(0)
    expect(result.tone).toBe('ok')
  })
})
