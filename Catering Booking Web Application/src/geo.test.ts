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

  it('นอกพื้นที่ไม่คิดค่าขนส่งจากฟังก์ชันนี้ (ทีมงานแจ้งเป็นรายงานแทน)', () => {
    expect(deliveryFeeFor(10, { zone: 'outside' }, 2000, 30)).toBe(0)
  })

  it('ไม่มีสถานที่ = ไม่คิดค่าขนส่ง', () => {
    expect(deliveryFeeFor(10, null, 2000, 30)).toBe(0)
  })
})

describe('checkDelivery', () => {
  it('นอกพื้นที่และไม่ถึงขั้นต่ำ = blocked', () => {
    const result = checkDelivery(10, 'outside', 2000, 30)
    expect(result.blocked).toBe(true)
    expect(result.tone).toBe('blocked')
  })

  it('นอกพื้นที่แต่ถึงขั้นต่ำ = จองได้ (info)', () => {
    const result = checkDelivery(30, 'outside', 2000, 30)
    expect(result.blocked).toBe(false)
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
