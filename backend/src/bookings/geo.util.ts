/**
 * คำนวณโซนบริการ/ระยะทางฝั่ง backend เอง แทนการเชื่อ zone/distanceKm ที่ client ส่งมาใน locationDetail
 * (แก้ raw request ปลอมโซนเพื่อลดค่าขนส่งได้ก่อนหน้านี้) ต้องให้ผลตรงกับ zoneFor ใน frontend src/geo.ts เป๊ะ
 * โดยรับ metroProvinces/homeProvince จาก Settings เดียวกัน (ไม่ hardcode) เพราะเจ้าของร้านแก้ค่านี้เองได้
 *
 * ข้อจำกัดที่ยังเหลืออยู่: province/address ที่ใช้หาโซนนี้ยังมาจาก client (ผลลัพธ์จาก geocode ฝั่งเบราว์เซอร์)
 * ไม่ได้ reverse-geocode พิกัด lat/lng ยืนยันซ้ำฝั่ง server จึงยังพอปลอมข้อความให้ตกโซนผิด (เช่น "outside" กลาย
 * เป็น "home") ได้อยู่บ้าง — ผลกระทบทางการเงินน้อยกว่าการปลอมราคา/ระยะทางที่ปิดไปแล้ว (ดู routeDistanceKm ด้านล่าง
 * ซึ่ง verify ระยะทางจริงเสมอสำหรับ zone "outside") การปิดช่องนี้ให้สนิทต้องเพิ่ม reverse-geocoding ฝั่ง server เอง
 */
export type ServiceZone = 'home' | 'metro' | 'outside'

const containsAny = (text: string, needles: string[]): boolean => {
  const lower = text.toLowerCase()
  return needles.some((p) => p.trim() !== '' && lower.includes(p.trim().toLowerCase()))
}

const zoneOfText = (text: string, homeProvince: string, metroProvinces: string[]): ServiceZone | null => {
  if (!text.trim()) return null
  if (containsAny(text, [homeProvince])) return 'home'
  if (containsAny(text, metroProvinces)) return 'metro'
  return null
}

export const zoneFor = (
  province: string,
  address = '',
  metroProvinces: string[],
  homeProvince: string,
): ServiceZone =>
  zoneOfText(province, homeProvince, metroProvinces) ?? zoneOfText(address, homeProvince, metroProvinces) ?? 'outside'

/** ค่าเดินทางไป-กลับของงานนอกพื้นที่ = ระยะทางเที่ยวเดียว (กม.) × 2 × ค่าน้ำมัน/กม. — ปัดเศษเป็นจำนวนเต็มบาท */
export const outsideDeliveryFeeFor = (distanceKm: number, fuelCostPerKm: number): number =>
  Math.round(distanceKm * 2 * fuelCostPerKm)

const OSRM = 'https://router.project-osrm.org'

interface OsrmRouteResponse {
  code: string
  routes?: { distance: number }[]
}

/**
 * ระยะทางถนนจริงจากร้านไปสถานที่งาน (กม., เที่ยวเดียว) — เรียก OSRM จาก backend เอง
 * แทนการเชื่อ distanceKm ที่ client คำนวณมาแล้วส่งมา (ป้องกันแก้ raw request ลดค่าเดินทาง)
 */
export async function routeDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  timeoutMs = 5000,
): Promise<number> {
  const url = `${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
    const data = (await res.json()) as OsrmRouteResponse
    const meters = data.routes?.[0]?.distance
    if (data.code !== 'Ok' || typeof meters !== 'number') throw new Error('OSRM: ไม่พบเส้นทาง')
    return meters / 1000
  } finally {
    clearTimeout(timer)
  }
}
