import type { EventLocation, LocationDetail, ServiceZone } from './types'

export type { ServiceZone }

/* ------------------------------------------------------------------ *
 * พื้นที่ให้บริการและค่าขนส่ง
 *   - นครปฐม (พื้นที่ร้าน) : รับจัดกี่โต๊ะก็ได้ ไม่มีค่าขนส่ง
 *   - นอกนครปฐม            : ขั้นต่ำ 30 โต๊ะ
 *       · กรุงเทพและปริมณฑล : ไม่ถึง 30 โต๊ะ จองได้ แต่คิดค่าขนส่ง 2,000 บาท
 *       · นอกพื้นที่        : ต้องครบ 30 โต๊ะ และทีมงานแจ้งค่าเดินทางเป็นรายงาน
 * ------------------------------------------------------------------ */
export const DELIVERY_FEE = 2000
/** ขั้นต่ำสำหรับงานนอกนครปฐม (ต่ำกว่านี้ในเขตกรุงเทพฯ ปริมณฑล = คิดค่าขนส่ง) */
export const FREE_DELIVERY_MIN_TABLES = 30

/** จังหวัดที่ร้านตั้งอยู่ */
export const HOME_PROVINCE = 'นครปฐม'

/** กรุงเทพและปริมณฑล (ไม่รวมนครปฐม เพราะนับเป็นพื้นที่ร้าน) */
export const METRO_PROVINCES = [
  'กรุงเทพมหานคร',
  'นนทบุรี',
  'ปทุมธานี',
  'สมุทรปราการ',
  'สมุทรสาคร',
]

const HOME_PATTERN = /นครปฐม|nakhon ?pathom/i
const METRO_PATTERN = /กรุงเทพ|กทม|bangkok|นนทบุรี|nonthaburi|ปทุมธานี|pathum ?thani|สมุทรปราการ|samut ?prakan|สมุทรสาคร|samut ?sakhon/i

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
  metro: 'กรุงเทพและปริมณฑล',
  outside: 'นอกพื้นที่ให้บริการ',
}

/** ค่าขนส่งของงานนี้ — คิดเฉพาะกรุงเทพและปริมณฑลที่ไม่ถึง 30 โต๊ะ */
export const deliveryFeeFor = (tables: number, location: { zone: ServiceZone } | null): number =>
  location?.zone === 'metro' && tables < FREE_DELIVERY_MIN_TABLES ? DELIVERY_FEE : 0

export interface DeliveryCheck {
  fee: number
  /** true = จำนวนโต๊ะไม่ถึงขั้นต่ำของพื้นที่นี้ จองต่อไม่ได้ */
  blocked: boolean
  tone: 'ok' | 'fee' | 'info' | 'blocked'
  title: string
  detail: string
}

/** สรุปเงื่อนไขพื้นที่ + ค่าขนส่งของงานหนึ่ง ๆ ไว้ให้หน้าจอนำไปแสดง */
export const checkDelivery = (tables: number, zone: ServiceZone): DeliveryCheck => {
  if (zone === 'home') {
    return {
      fee: 0,
      blocked: false,
      tone: 'ok',
      title: `อยู่ในพื้นที่ร้าน (${HOME_PROVINCE})`,
      detail: 'รับจัดกี่โต๊ะก็ได้ ไม่มีขั้นต่ำและไม่มีค่าขนส่ง',
    }
  }

  const short = tables < FREE_DELIVERY_MIN_TABLES

  if (zone === 'metro') {
    return short
      ? {
          fee: DELIVERY_FEE,
          blocked: false,
          tone: 'fee',
          title: `ค่าขนส่ง ${DELIVERY_FEE.toLocaleString()} บาท`,
          detail: `งานนอก${HOME_PROVINCE}ขั้นต่ำ ${FREE_DELIVERY_MIN_TABLES} โต๊ะ — งานนี้ ${tables} โต๊ะ จองได้แต่มีค่าขนส่ง`,
        }
      : {
          fee: 0,
          blocked: false,
          tone: 'ok',
          title: 'ไม่มีค่าขนส่ง',
          detail: `งานนี้ ${tables} โต๊ะ ครบขั้นต่ำ ${FREE_DELIVERY_MIN_TABLES} โต๊ะ ในเขตกรุงเทพและปริมณฑล`,
        }
  }

  return short
    ? {
        fee: 0,
        blocked: true,
        tone: 'blocked',
        title: `พื้นที่นี้ต้องสั่งขั้นต่ำ ${FREE_DELIVERY_MIN_TABLES} โต๊ะ`,
        detail: `งานนี้ ${tables} โต๊ะ — กรุณาเพิ่มเป็น ${FREE_DELIVERY_MIN_TABLES} โต๊ะขึ้นไป หรือติดต่อร้านเพื่อสอบถามเป็นกรณีพิเศษ`,
      }
    : {
        fee: 0,
        blocked: false,
        tone: 'info',
        title: 'นอกพื้นที่ให้บริการปกติ',
        detail: `งานนี้ ${tables} โต๊ะ ครบขั้นต่ำแล้ว — ทีมงานจะติดต่อแจ้งค่าเดินทางอีกครั้ง`,
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
