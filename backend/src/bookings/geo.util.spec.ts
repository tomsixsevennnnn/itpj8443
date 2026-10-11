import { clearRouteCache, outsideDeliveryFeeFor, routeDistanceKm, zoneFor } from './geo.util'

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

const zone = (province: string, address = '') => zoneFor(province, METRO_PROVINCES, HOME_PROVINCE, address)

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

describe('routeDistanceKm cache', () => {
  const from = { lat: 13.8196, lng: 100.0603 }
  const to = { lat: 14.0, lng: 100.5 }
  const okResponse = { ok: true, json: async () => ({ code: 'Ok', routes: [{ distance: 50000 }] }) }

  afterEach(() => {
    jest.restoreAllMocks()
    clearRouteCache()
  })

  it('เส้นทางเดิม (พิกัดต่างกันไม่ถึง ~11 ม.) เรียก OSRM ครั้งเดียว และส่ง User-Agent', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse as Response)
    expect(await routeDistanceKm(from, to)).toBe(50)
    expect(await routeDistanceKm({ lat: from.lat + 0.00001, lng: from.lng }, to)).toBe(50)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toHaveProperty('User-Agent')
  })

  it('เรียกไม่สำเร็จ — ไม่จำผลที่ผิดพลาด ลองใหม่ได้', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce(okResponse as Response)
    await expect(routeDistanceKm(from, to)).rejects.toThrow()
    expect(await routeDistanceKm(from, to)).toBe(50)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
