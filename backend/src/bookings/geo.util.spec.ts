import { outsideDeliveryFeeFor, zoneFor } from './geo.util'

/** ต้องให้ผลตรงกับ zoneFor ใน frontend src/geo.ts เป๊ะ (เทสต์เคสเดียวกับ src/geo.test.ts) — ค่าเริ่มต้นจาก DEFAULT_METRO_PROVINCES/DEFAULT_HOME_PROVINCE ที่นั่น */
const METRO_PROVINCES = [
  'กรุงเทพมหานคร',
  'นนทบุรี',
  'ปทุมธานี',
  'สมุทรปราการ',
  'สมุทรสาคร',
  'สมุทรสงคราม',
  'สุพรรณบุรี',
  'ราชบุรี',
  'กาญจนบุรี',
]
const HOME_PROVINCE = 'นครปฐม'

const zone = (province: string, address = '') => zoneFor(province, address, METRO_PROVINCES, HOME_PROVINCE)

describe('zoneFor', () => {
  it('นครปฐม = พื้นที่ร้าน', () => {
    expect(zone('นครปฐม')).toBe('home')
  })

  it('กรุงเทพและปริมณฑล = metro', () => {
    expect(zone('กรุงเทพมหานคร')).toBe('metro')
    expect(zone('นนทบุรี')).toBe('metro')
  })

  it('จังหวัดที่ติดกับนครปฐม = metro', () => {
    expect(zone('สุพรรณบุรี')).toBe('metro')
    expect(zone('ราชบุรี')).toBe('metro')
    expect(zone('กาญจนบุรี')).toBe('metro')
    expect(zone('สมุทรสงคราม')).toBe('metro')
  })

  it('จังหวัดอื่น = นอกพื้นที่', () => {
    expect(zone('เชียงใหม่')).toBe('outside')
  })

  it('เช็คจากที่อยู่เต็มถ้าชื่อจังหวัดไม่ตรง', () => {
    expect(zone('', 'ถนนสุขุมวิท กรุงเทพมหานคร 10110')).toBe('metro')
  })
})

describe('outsideDeliveryFeeFor', () => {
  it('ค่าเดินทางไป-กลับ = ระยะทางเที่ยวเดียว × 2 × ค่าน้ำมัน/กม.', () => {
    expect(outsideDeliveryFeeFor(50, 8)).toBe(800)
  })

  it('ปัดเศษเป็นจำนวนเต็มบาท', () => {
    expect(outsideDeliveryFeeFor(50.3333, 8)).toBe(Math.round(50.3333 * 2 * 8))
  })
})
