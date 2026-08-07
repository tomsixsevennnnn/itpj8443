import type { EventLocation, LocationDetail, ServiceZone, ShopLocation } from './types'

export type { ServiceZone }

/* ------------------------------------------------------------------ *
 * พื้นที่ให้บริการและค่าขนส่ง
 *   - นครปฐม (พื้นที่ร้าน)                       : รับจัดกี่โต๊ะก็ได้ ไม่มีค่าขนส่ง ไม่มีขั้นต่ำ
 *   - กรุงเทพ ปริมณฑล + จังหวัดที่ติดกับนครปฐม   : ขั้นต่ำ 30 โต๊ะ — ไม่ถึงจองได้ แต่คิดค่าขนส่ง 2,000 บาท
 *   - จังหวัดอื่นที่ไม่ได้ติดกับนครปฐม             : รับจัดกี่โต๊ะก็ได้ ไม่มีขั้นต่ำ คิดค่าเดินทางตามระยะทางถนนจริง
 *                                                    (ไป-กลับ) คูณค่าน้ำมันต่อกิโลเมตรที่ตั้งค่าไว้
 * ------------------------------------------------------------------ */
/** ค่าเริ่มต้น — แก้ไขได้จริงจากหน้า "ตั้งค่า" ฝั่งร้าน (ค่านี้ใช้เป็นค่าเริ่มต้นของ AppSettings) */
export const DEFAULT_DELIVERY_FEE = 2000
/** ขั้นต่ำสำหรับงานนอกนครปฐม (ต่ำกว่านี้ในเขตกรุงเทพฯ ปริมณฑล และจังหวัดติดกัน = คิดค่าขนส่ง) — แก้ไขได้จากหน้า "ตั้งค่า" */
export const DEFAULT_FREE_DELIVERY_MIN_TABLES = 30
/** พิกัดร้านเริ่มต้น (องค์พระปฐมเจดีย์) — แก้ไขได้จากหน้า "ตั้งค่า" ใช้เป็นจุดเริ่มต้นคำนวณระยะทางงานนอกพื้นที่ */
export const DEFAULT_SHOP_LOCATION: ShopLocation = { lat: 13.8196, lng: 100.0603 }
/** ค่าน้ำมันเริ่มต้น (บาท/กม.) — แก้ไขได้จากหน้า "ตั้งค่า" */
export const DEFAULT_FUEL_COST_PER_KM = 8

/** จังหวัดที่ร้านตั้งอยู่ */
export const HOME_PROVINCE = 'นครปฐม'

/**
 * กรุงเทพและปริมณฑล + จังหวัดที่มีอาณาเขตติดกับนครปฐมโดยตรง (ไม่รวมนครปฐมเอง เพราะนับเป็นพื้นที่ร้าน)
 * ติดนครปฐม: สุพรรณบุรี, นนทบุรี, กรุงเทพมหานคร, สมุทรสาคร, สมุทรสงคราม, ราชบุรี, กาญจนบุรี
 */
export const METRO_PROVINCES = [
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

const HOME_PATTERN = /นครปฐม|nakhon ?pathom/i
const METRO_PATTERN =
  /กรุงเทพ|กทม|bangkok|นนทบุรี|nonthaburi|ปทุมธานี|pathum ?thani|สมุทรปราการ|samut ?prakan|สมุทรสาคร|samut ?sakhon|สมุทรสงคราม|samut ?songkhram|สุพรรณบุรี|suphan ?buri|ราชบุรี|ratchaburi|กาญจนบุรี|kanchanaburi/i

const zoneOfText = (text: string): ServiceZone | null => {
  if (!text.trim()) return null
  if (HOME_PATTERN.test(text)) return 'home'
  if (METRO_PATTERN.test(text)) return 'metro'
  return null
}

/** หาโซนบริการ — ดูจากชื่อจังหวัดก่อน ถ้าไม่ตรงค่อยดูจากที่อยู่เต็ม */
export const zoneFor = (province: string, address = ''): ServiceZone =>
  zoneOfText(province) ?? zoneOfText(address) ?? 'outside'

export const ZONE_LABEL: Record<ServiceZone, string> = {
  home: `พื้นที่ร้าน (${HOME_PROVINCE})`,
  metro: 'กรุงเทพ ปริมณฑล และจังหวัดใกล้เคียง',
  outside: 'นอกพื้นที่ให้บริการ',
}

/** ค่าเดินทางไป-กลับของงานนอกพื้นที่ = ระยะทางเที่ยวเดียว (กม.) × 2 × ค่าน้ำมัน/กม. — ปัดเศษเป็นจำนวนเต็มบาท */
export const outsideDeliveryFeeFor = (distanceKm: number, fuelCostPerKm: number): number =>
  Math.round(distanceKm * 2 * fuelCostPerKm)

/** ค่าขนส่งของงานนี้ — metro คิดเมื่อไม่ถึงขั้นต่ำ, outside คิดตามระยะทางจริง (ต้องรู้ distanceKm แล้วเท่านั้น) */
export const deliveryFeeFor = (
  tables: number,
  location: { zone: ServiceZone; distanceKm?: number } | null,
  deliveryFee: number = DEFAULT_DELIVERY_FEE,
  minTables: number = DEFAULT_FREE_DELIVERY_MIN_TABLES,
  fuelCostPerKm: number = DEFAULT_FUEL_COST_PER_KM
): number => {
  if (!location) return 0
  if (location.zone === 'metro') return tables < minTables ? deliveryFee : 0
  if (location.zone === 'outside' && location.distanceKm != null) {
    return outsideDeliveryFeeFor(location.distanceKm, fuelCostPerKm)
  }
  return 0
}

export interface DeliveryCheck {
  fee: number
  /** true = จำนวนโต๊ะไม่ถึงขั้นต่ำของพื้นที่นี้ จองต่อไม่ได้ */
  blocked: boolean
  tone: 'ok' | 'fee' | 'info' | 'blocked'
  title: string
  detail: string
}

/** ข้อมูลระยะทางของงานนอกพื้นที่ — คำนวณแบบ async จากหน้าจอ (เรียก routeDistanceKm) แล้วส่งเข้า checkDelivery */
export interface OutsideDeliveryContext {
  /** ระยะทางถนนจริงจากร้านไปสถานที่งาน (กม., เที่ยวเดียว) — null = ยังคำนวณไม่ได้/คำนวณไม่สำเร็จ */
  distanceKm: number | null
  fuelCostPerKm: number
  /** true = กำลังเรียก routeDistanceKm อยู่ */
  loading?: boolean
}

/** สรุปเงื่อนไขพื้นที่ + ค่าขนส่งของงานหนึ่ง ๆ ไว้ให้หน้าจอนำไปแสดง */
export const checkDelivery = (
  tables: number,
  zone: ServiceZone,
  deliveryFee: number = DEFAULT_DELIVERY_FEE,
  minTables: number = DEFAULT_FREE_DELIVERY_MIN_TABLES,
  outside?: OutsideDeliveryContext
): DeliveryCheck => {
  if (zone === 'home') {
    return {
      fee: 0,
      blocked: false,
      tone: 'ok',
      title: `อยู่ในพื้นที่ร้าน (${HOME_PROVINCE})`,
      detail: 'รับจัดกี่โต๊ะก็ได้ ไม่มีขั้นต่ำและไม่มีค่าขนส่ง',
    }
  }

  if (zone === 'metro') {
    const short = tables < minTables
    return short
      ? {
          fee: deliveryFee,
          blocked: false,
          tone: 'fee',
          title: `ค่าขนส่ง ${deliveryFee.toLocaleString()} บาท`,
          detail: `งานนอก${HOME_PROVINCE}ขั้นต่ำ ${minTables} โต๊ะ — งานนี้ ${tables} โต๊ะ จองได้แต่มีค่าขนส่ง`,
        }
      : {
          fee: 0,
          blocked: false,
          tone: 'ok',
          title: 'ไม่มีค่าขนส่ง',
          detail: `งานนี้ ${tables} โต๊ะ ครบขั้นต่ำ ${minTables} โต๊ะ ในเขตกรุงเทพ ปริมณฑล และจังหวัดใกล้เคียง`,
        }
  }

  // zone === 'outside' — รับจัดกี่โต๊ะก็ได้ ไม่มีขั้นต่ำ คิดค่าเดินทางไป-กลับตามระยะทางถนนจริง
  if (!outside || outside.loading) {
    return {
      fee: 0,
      blocked: false,
      tone: 'info',
      title: 'กำลังคำนวณระยะทาง...',
      detail: `งานนี้ ${tables} โต๊ะ — นอกพื้นที่ให้บริการปกติ ไม่มีขั้นต่ำจำนวนโต๊ะ คิดค่าเดินทางตามระยะทางจริง (ไป-กลับ) คูณค่าน้ำมันต่อกิโลเมตร`,
    }
  }

  if (outside.distanceKm == null) {
    return {
      fee: 0,
      blocked: false,
      tone: 'info',
      title: 'คำนวณระยะทางไม่สำเร็จ',
      detail: `งานนี้ ${tables} โต๊ะ — จองได้ปกติ ไม่มีขั้นต่ำ แต่ทีมงานจะติดต่อแจ้งค่าเดินทางอีกครั้ง`,
    }
  }

  const roundTripKm = outside.distanceKm * 2
  const fee = outsideDeliveryFeeFor(outside.distanceKm, outside.fuelCostPerKm)
  return {
    fee,
    blocked: false,
    tone: 'fee',
    title: `ค่าเดินทาง ${fee.toLocaleString()} บาท`,
    detail: `ระยะทาง ${outside.distanceKm.toFixed(1)} กม. ไป-กลับ ${roundTripKm.toFixed(1)} กม. × ค่าน้ำมัน ${outside.fuelCostPerKm.toLocaleString()} บาท/กม. — ไม่มีขั้นต่ำจำนวนโต๊ะ`,
  }
}

export const emptyDetail = (): LocationDetail => ({
  houseNo: '',
  building: '',
  village: '',
  landmark: '',
  accessNote: '',
})

/** รวมรายละเอียดที่ลูกค้ากรอกเข้ากับที่อยู่จากแผนที่ ให้เป็นบรรทัดเดียวสำหรับร้าน */
export const formatFullAddress = (loc: EventLocation): string => {
  const { houseNo, building, village, landmark } = loc.detail
  const prefix = [houseNo, building, village].filter(Boolean).join(' ')
  const base = [prefix, loc.address].filter(Boolean).join(' ')
  return landmark ? `${base} (จุดสังเกต: ${landmark})` : base
}

/* ------------------------------------------------------------------ *
 * Routing ผ่าน OSRM (public demo server) — ใช้หาระยะทางถนนจริง (ไม่ใช่เส้นตรง)
 * สำหรับคิดค่าเดินทางงานนอกพื้นที่ ไม่ต้องใช้ API key เหมือน Nominatim ด้านล่าง
 * ------------------------------------------------------------------ */
const OSRM = 'https://router.project-osrm.org'

interface OsrmRouteResponse {
  code: string
  routes?: { distance: number }[]
}

/** ระยะทางถนนจริงจากจุดหนึ่งไปอีกจุดหนึ่ง (กม., เที่ยวเดียว) */
export async function routeDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  signal?: AbortSignal
): Promise<number> {
  const url = `${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`คำนวณระยะทางไม่สำเร็จ (${res.status})`)
  const data: OsrmRouteResponse = await res.json()
  const meters = data.routes?.[0]?.distance
  if (data.code !== 'Ok' || typeof meters !== 'number') throw new Error('ไม่พบเส้นทางไปยังสถานที่นี้')
  return meters / 1000
}

/* ------------------------------------------------------------------ *
 * Geocoding ผ่าน Nominatim (OpenStreetMap) — ไม่ต้องใช้ API key
 * ------------------------------------------------------------------ */
const NOMINATIM = 'https://nominatim.openstreetmap.org'

export interface GeoResult {
  name: string
  address: string
  province: string
  lat: number
  lng: number
}

interface NominatimAddress {
  province?: string
  state?: string
  city?: string
  county?: string
}

interface NominatimPlace {
  name?: string
  display_name: string
  lat: string
  lon: string
  address?: NominatimAddress
}

const toGeoResult = (place: NominatimPlace): GeoResult => {
  const parts = place.display_name.split(',').map(s => s.trim())
  const a = place.address ?? {}
  return {
    name: place.name?.trim() || parts[0] || 'ตำแหน่งที่เลือก',
    address: place.display_name,
    province: a.province ?? a.state ?? a.city ?? a.county ?? '',
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
  }
}

/** ค้นหาสถานที่จากชื่อหรือที่อยู่ */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const url =
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6` +
    `&accept-language=th&countrycodes=th&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`ค้นหาไม่สำเร็จ (${res.status})`)
  const data: NominatimPlace[] = await res.json()
  return data.map(toGeoResult)
}

/** แปลงพิกัดกลับเป็นชื่อสถานที่/ที่อยู่ (ใช้ตอนลากหมุดหรือกดบนแผนที่) */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<GeoResult | null> {
  const url =
    `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1` +
    `&accept-language=th&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`ระบุที่อยู่ไม่สำเร็จ (${res.status})`)
  const data: NominatimPlace & { error?: string } = await res.json()
  if (data.error || !data.display_name) return null
  return toGeoResult(data)
}

/** สถานที่ยอดนิยม ใช้เป็นทางลัดและเป็นตัวสำรองเมื่อค้นหาออนไลน์ไม่ได้ */
export const PRESET_LOCATIONS: GeoResult[] = [
  {
    name: 'องค์พระปฐมเจดีย์',
    address: 'ต.พระปฐมเจดีย์ อ.เมืองนครปฐม นครปฐม 73000',
    province: 'นครปฐม',
    lat: 13.8196,
    lng: 100.0603,
  },
  {
    name: 'มหาวิทยาลัยศิลปากร วิทยาเขตพระราชวังสนามจันทร์',
    address: '6 ถ.ราชมรรคาใน ต.พระปฐมเจดีย์ อ.เมืองนครปฐม นครปฐม 73000',
    province: 'นครปฐม',
    lat: 13.8193,
    lng: 100.0421,
  },
  {
    name: 'โรงแรม Centara Grand at CentralWorld',
    address: '999/99 ถ.พระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330',
    province: 'กรุงเทพมหานคร',
    lat: 13.7466,
    lng: 100.5396,
  },
  {
    name: 'อาคาร SCB Park Plaza',
    address: '19 ถ.รัชดาภิเษก แขวงจตุจักร เขตจตุจักร กรุงเทพมหานคร 10900',
    province: 'กรุงเทพมหานคร',
    lat: 13.8283,
    lng: 100.5637,
  },
  {
    name: 'โรงแรม Novotel Bangkok Sukhumvit 20',
    address: '19/9 ซ.สุขุมวิท 20 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    province: 'กรุงเทพมหานคร',
    lat: 13.7304,
    lng: 100.5657,
  },
  {
    name: 'อิมแพ็ค เมืองทองธานี',
    address: '99 ถ.ป็อปปูล่า ต.บ้านใหม่ อ.ปากเกร็ด นนทบุรี 11120',
    province: 'นนทบุรี',
    lat: 13.9127,
    lng: 100.5471,
  },
]

/** ค้นหาจากรายการสำรอง (ใช้เมื่อเรียก Nominatim ไม่ได้) */
export const searchPresets = (query: string): GeoResult[] => {
  const q = query.trim().toLowerCase()
  if (!q) return PRESET_LOCATIONS
  return PRESET_LOCATIONS.filter(
    l => l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
  )
}

/* ------------------------------------------------------------------ *
 * วางลิงก์ Google Maps แทนค้นหา — Nominatim แยกคำภาษาไทยไม่แม่น (tokenizer ไม่รองรับภาษาไทย)
 * ลิงก์เต็ม (คัดลอกจาก address bar) แกะพิกัดจาก URL ได้ตรงๆ ฝั่งนี้ ไม่ต้องเรียก API ใดๆ
 * ลิงก์สั้นจากปุ่ม "แชร์" (maps.app.goo.gl) ต้องให้ backend ตาม redirect ก่อน — Google ไม่เปิด CORS ให้ยิงตรงจาก browser
 * ------------------------------------------------------------------ */
const GOOGLE_MAPS_SHORT_HOSTS = ['maps.app.goo.gl', 'goo.gl']

const parseUrlSafe = (text: string): URL | null => {
  const trimmed = text.trim()
  try {
    return new URL(trimmed)
  } catch {
    // บางเบราว์เซอร์ copy จาก address bar มาโดยตัด https:// ออก — ลองเติมให้ก่อนยอมแพ้
    try {
      return new URL(`https://${trimmed}`)
    } catch {
      return null
    }
  }
}

export const isGoogleMapsShortLink = (text: string): boolean => {
  const url = parseUrlSafe(text)
  return url !== null && GOOGLE_MAPS_SHORT_HOSTS.includes(url.hostname)
}

/**
 * true ทั้งลิงก์เต็มของ Google Maps (ทุกโดเมนย่อย/ประเทศ เช่น google.com, maps.google.com, google.co.th)
 * และลิงก์สั้น maps.app.goo.gl / goo.gl
 */
export const isGoogleMapsUrl = (text: string): boolean => {
  const url = parseUrlSafe(text)
  if (!url) return false
  if (GOOGLE_MAPS_SHORT_HOSTS.includes(url.hostname)) return true
  // ครอบคลุม www.google.com, maps.google.com, google.co.th, www.google.de ฯลฯ — ไม่ใช่แค่ *.google.com เฉยๆ
  if (!/(^|\.)google\.[a-z.]+$/.test(url.hostname)) return false
  return url.hostname.startsWith('maps.') || url.pathname.includes('/maps')
}

/** แกะพิกัดจากลิงก์ Google Maps เต็มรูปแบบ — ลองรูปแบบที่แม่นสุดก่อน แล้วค่อยหยาบลงเรื่อยๆ */
export const parseGoogleMapsUrl = (text: string): { lat: number; lng: number } | null => {
  const url = text.trim()

  // !3d<lat>!4d<lng> — พิกัดหมุดจริงที่ปักไว้ในหน้าสถานที่ แม่นที่สุด
  const pin = url.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/)
  if (pin) return { lat: parseFloat(pin[1]), lng: parseFloat(pin[2]) }

  // ?q=<lat>,<lng> หรือ ?query=<lat>,<lng>
  const query = url.match(/[?&](?:q|query)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)
  if (query) return { lat: parseFloat(query[1]), lng: parseFloat(query[2]) }

  // ?ll=<lat>,<lng>
  const ll = url.match(/[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)
  if (ll) return { lat: parseFloat(ll[1]), lng: parseFloat(ll[2]) }

  // @<lat>,<lng>,<zoom> — จุดกึ่งกลางแผนที่ตอนคัดลอกลิงก์ มีอยู่เกือบทุกลิงก์แต่หยาบสุด
  const center = url.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)
  if (center) return { lat: parseFloat(center[1]), lng: parseFloat(center[2]) }

  return null
}
