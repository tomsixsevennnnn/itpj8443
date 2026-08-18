import type { AppSettings, Booking, Category, MenuItem, Package, QueueBooking } from './types'
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_ORDER } from './data'
import {
  DEFAULT_BOOKING_TERMS,
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_QUOTATION_VALID_DAYS,
  DEFAULT_SHOP_INFO,
} from './documents'
import { DEFAULT_HOME_PROVINCE, DEFAULT_METRO_PROVINCES } from './geo'
import { DEFAULT_HOME_CONTENT, type HomeContent } from './homeContent'
import { DEFAULT_STAFF_RATIOS } from './staffing'
import { DEFAULT_SLOT_HOURS } from './availability'
import { DEFAULT_BRAND_COLOR } from './theme'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${init.method ?? 'GET'} ${path} -> ${res.status} ${text}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/* ------------------------------------------------------------------ *
 * backend ใช้ status ตัวพิมพ์ใหญ่ (enum Prisma) และแยกฟิลด์ shopInfo
 * เป็น flat fields — แปลงกลับไปมาให้ตรงกับ types.ts ฝั่ง frontend ตรงนี้ที่เดียว
 * ------------------------------------------------------------------ */

type BackendStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

interface BackendBooking extends Omit<Booking, 'status' | 'paymentSlip'> {
  status: BackendStatus
  paymentSlipUrl?: string | null
}

const toFrontendBooking = (b: BackendBooking): Booking => ({
  ...b,
  status: b.status.toLowerCase() as Booking['status'],
  paymentSlip: b.paymentSlipUrl ?? undefined,
})

const toBackendStatus = (status: Booking['status']): BackendStatus => status.toUpperCase() as BackendStatus

type BackendQueueBooking = Omit<QueueBooking, 'status'> & { status: BackendStatus }

const toFrontendQueueBooking = (b: BackendQueueBooking): QueueBooking => ({
  ...b,
  status: b.status.toLowerCase() as QueueBooking['status'],
})

interface BackendSettings {
  shopName: string
  shopNameEn: string
  shopInitials: string
  shopAddress: string
  shopPhone: string
  shopLine: string
  bankName: string
  bankAccountNumber: string
  bankAccountName: string
  promptPayQr: string
  shopLogo: string
  shopLoginTagline: string
  depositRate: number
  deliveryFee: number
  freeDeliveryMinTables: number
  metroProvinces: string[]
  homeProvince: string
  brandColor: string
  wageChef: number
  wageAssistant: number
  wageServerPerTable: number
  wageDishwasher: number
  tablesPerServer: number
  tablesPerSupport: number
  staffRemainderThreshold: number
  slotMorningHours: string
  slotNoonHours: string
  slotEveningHours: string
  quotationValidDays: number
  quotationTerms: string[]
  bookingTerms: string[]
  categories: Category[] | null
  categoryOrder: string[]
  shopLocationLat: number
  shopLocationLng: number
  fuelCostPerKm: number
  homeContent: HomeContent | null
}

const toFrontendSettings = (s: BackendSettings): AppSettings => ({
  shopInfo: {
    name: s.shopName,
    nameEn: s.shopNameEn,
    initials: s.shopInitials,
    address: s.shopAddress,
    phone: s.shopPhone,
    line: s.shopLine,
    bankName: s.bankName,
    bankAccountNumber: s.bankAccountNumber,
    bankAccountName: s.bankAccountName,
    promptPayQr: s.promptPayQr,
    logo: s.shopLogo ?? '',
    loginTagline: s.shopLoginTagline ?? DEFAULT_SHOP_INFO.loginTagline,
  },
  depositRate: s.depositRate,
  deliveryFee: s.deliveryFee,
  freeDeliveryMinTables: s.freeDeliveryMinTables,
  // เผื่อ backend เก่า/ยังไม่ migrate ที่ส่ง settings มาโดยไม่มีฟิลด์นี้ — กันหน้าเลือกสถานที่พังทั้งหน้า
  metroProvinces: s.metroProvinces ?? DEFAULT_METRO_PROVINCES,
  homeProvince: s.homeProvince ?? DEFAULT_HOME_PROVINCE,
  brandColor: s.brandColor ?? DEFAULT_BRAND_COLOR,
  wageChef: s.wageChef,
  wageAssistant: s.wageAssistant,
  wageServerPerTable: s.wageServerPerTable,
  wageDishwasher: s.wageDishwasher,
  tablesPerServer: s.tablesPerServer ?? DEFAULT_STAFF_RATIOS.tablesPerServer,
  tablesPerSupport: s.tablesPerSupport ?? DEFAULT_STAFF_RATIOS.tablesPerSupport,
  staffRemainderThreshold: s.staffRemainderThreshold ?? DEFAULT_STAFF_RATIOS.staffRemainderThreshold,
  timeSlotHours: {
    morning: s.slotMorningHours ?? DEFAULT_SLOT_HOURS.morning,
    noon: s.slotNoonHours ?? DEFAULT_SLOT_HOURS.noon,
    evening: s.slotEveningHours ?? DEFAULT_SLOT_HOURS.evening,
  },
  quotationValidDays: s.quotationValidDays ?? DEFAULT_QUOTATION_VALID_DAYS,
  quotationTerms: s.quotationTerms ?? DEFAULT_QUOTATION_TERMS,
  bookingTerms: s.bookingTerms ?? DEFAULT_BOOKING_TERMS,
  // เผื่อ backend เก่า/ยังไม่ migrate ที่ส่ง settings มาโดยไม่มีฟิลด์นี้ — กันหน้าแพ็กเกจ/เมนูพังทั้งหน้า
  categories: s.categories ?? DEFAULT_CATEGORIES,
  categoryOrder: s.categoryOrder ?? DEFAULT_CATEGORY_ORDER,
  shopLocation: { lat: s.shopLocationLat, lng: s.shopLocationLng },
  fuelCostPerKm: s.fuelCostPerKm,
  // ยังไม่เคย customize (หรือ backend เก่ายังไม่มีคอลัมน์นี้) — ใช้เนื้อหาเริ่มต้นเดิมของหน้าแรก
  homeContent: s.homeContent ?? DEFAULT_HOME_CONTENT,
})

const toBackendSettingsPatch = (patch: Partial<AppSettings>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  const si = patch.shopInfo
  if (si?.name !== undefined) out.shopName = si.name
  if (si?.nameEn !== undefined) out.shopNameEn = si.nameEn
  if (si?.initials !== undefined) out.shopInitials = si.initials
  if (si?.address !== undefined) out.shopAddress = si.address
  if (si?.phone !== undefined) out.shopPhone = si.phone
  if (si?.line !== undefined) out.shopLine = si.line
  if (si?.bankName !== undefined) out.bankName = si.bankName
  if (si?.bankAccountNumber !== undefined) out.bankAccountNumber = si.bankAccountNumber
  if (si?.bankAccountName !== undefined) out.bankAccountName = si.bankAccountName
  if (si?.promptPayQr !== undefined) out.promptPayQr = si.promptPayQr
  if (si?.logo !== undefined) out.shopLogo = si.logo
  if (si?.loginTagline !== undefined) out.shopLoginTagline = si.loginTagline
  if (patch.depositRate !== undefined) out.depositRate = patch.depositRate
  if (patch.deliveryFee !== undefined) out.deliveryFee = patch.deliveryFee
  if (patch.freeDeliveryMinTables !== undefined) out.freeDeliveryMinTables = patch.freeDeliveryMinTables
  if (patch.metroProvinces !== undefined) out.metroProvinces = patch.metroProvinces
  if (patch.homeProvince !== undefined) out.homeProvince = patch.homeProvince
  if (patch.brandColor !== undefined) out.brandColor = patch.brandColor
  if (patch.wageChef !== undefined) out.wageChef = patch.wageChef
  if (patch.wageAssistant !== undefined) out.wageAssistant = patch.wageAssistant
  if (patch.wageServerPerTable !== undefined) out.wageServerPerTable = patch.wageServerPerTable
  if (patch.wageDishwasher !== undefined) out.wageDishwasher = patch.wageDishwasher
  if (patch.tablesPerServer !== undefined) out.tablesPerServer = patch.tablesPerServer
  if (patch.tablesPerSupport !== undefined) out.tablesPerSupport = patch.tablesPerSupport
  if (patch.staffRemainderThreshold !== undefined) out.staffRemainderThreshold = patch.staffRemainderThreshold
  if (patch.timeSlotHours?.morning !== undefined) out.slotMorningHours = patch.timeSlotHours.morning
  if (patch.timeSlotHours?.noon !== undefined) out.slotNoonHours = patch.timeSlotHours.noon
  if (patch.timeSlotHours?.evening !== undefined) out.slotEveningHours = patch.timeSlotHours.evening
  if (patch.quotationValidDays !== undefined) out.quotationValidDays = patch.quotationValidDays
  if (patch.quotationTerms !== undefined) out.quotationTerms = patch.quotationTerms
  if (patch.bookingTerms !== undefined) out.bookingTerms = patch.bookingTerms
  if (patch.categories !== undefined) out.categories = patch.categories
  if (patch.categoryOrder !== undefined) out.categoryOrder = patch.categoryOrder
  if (patch.shopLocation?.lat !== undefined) out.shopLocationLat = patch.shopLocation.lat
  if (patch.shopLocation?.lng !== undefined) out.shopLocationLng = patch.shopLocation.lng
  if (patch.fuelCostPerKm !== undefined) out.fuelCostPerKm = patch.fuelCostPerKm
  if (patch.homeContent !== undefined) out.homeContent = patch.homeContent
  return out
}

export interface BackendUser {
  id: string
  auth0Sub: string
  role: 'CUSTOMER' | 'OWNER'
  name: string
  surname: string
  phone: string
  lineId: string
  email: string
  avatar: string
}

export interface CourseInput {
  no: number
  title: string
  icon?: string
  category: string
  choose: number
  itemIds: string[]
}

export interface CreatePackageInput {
  name: string
  pricePerTable: number
  menuLimit: number
  description?: string
  features?: string[]
  badge?: string
  courses: CourseInput[]
}

export type UpdatePackageInput = Partial<CreatePackageInput>

export interface CreateBookingInput {
  date: string
  timeSlot: string
  tables: number
  guestCount: number
  /** backend คำนวณราคา/ชื่อแพ็กเกจเองจาก id นี้ — กันแก้ request body ปลอมราคาจองผ่าน DevTools */
  packageId: string
  location: string
  locationDetail?: unknown
  menus: string[]
  lineId?: string
}

export interface SyncProfileInput {
  name: string
  surname?: string
  email: string
  avatar?: string
}

export const api = {
  /** เรียกทันทีหลัง login — ส่ง profile จาก ID token ไปให้ backend เก็บ (access token ไม่มี name/email/picture) */
  syncProfile: (token: string, input: SyncProfileInput) =>
    request<BackendUser>(token, '/users/me', { method: 'POST', body: JSON.stringify(input) }),

  updateProfile: (token: string, patch: { name?: string; surname?: string; phone?: string; lineId?: string }) =>
    request<BackendUser>(token, '/users/me', { method: 'PATCH', body: JSON.stringify(patch) }),

  bookings: async (token: string): Promise<Booking[]> =>
    (await request<BackendBooking[]>(token, '/bookings')).map(toFrontendBooking),

  /** คิวรับงานของทุกลูกค้า (ไม่มีข้อมูลส่วนตัว) — ใช้เช็ควันที่เต็มแล้วตอนเลือกวันจัดงาน ต่างจาก bookings() ที่ลูกค้าเห็นแค่ของตัวเอง */
  bookingsAvailability: async (token: string): Promise<QueueBooking[]> =>
    (await request<BackendQueueBooking[]>(token, '/bookings/availability')).map(toFrontendQueueBooking),

  createBooking: async (token: string, input: CreateBookingInput): Promise<Booking> =>
    toFrontendBooking(
      await request<BackendBooking>(token, '/bookings', { method: 'POST', body: JSON.stringify(input) }),
    ),

  updateBookingAsOwner: async (
    token: string,
    id: string,
    patch: { status?: Booking['status']; staffAuto?: unknown; staffActual?: unknown; staffNote?: string },
  ): Promise<Booking> =>
    toFrontendBooking(
      await request<BackendBooking>(token, `/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...patch, status: patch.status ? toBackendStatus(patch.status) : undefined }),
      }),
    ),

  uploadPaymentSlip: async (token: string, id: string, paymentSlipUrl: string): Promise<Booking> =>
    toFrontendBooking(
      await request<BackendBooking>(token, `/bookings/${id}/payment-slip`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentSlipUrl }),
      }),
    ),

  packages: (token: string) => request<Package[]>(token, '/packages'),

  createPackage: (token: string, input: CreatePackageInput) =>
    request<Package>(token, '/packages', { method: 'POST', body: JSON.stringify(input) }),

  updatePackage: (token: string, id: string, input: UpdatePackageInput) =>
    request<Package>(token, `/packages/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  deletePackage: (token: string, id: string) => request<void>(token, `/packages/${id}`, { method: 'DELETE' }),

  /** ลากจัดเรียงแพ็กเกจในหน้า "จัดการแพ็กเกจ" — ids ต้องส่งครบทุกแพ็กเกจที่มีอยู่ ตามลำดับใหม่ */
  reorderPackages: (token: string, ids: string[]) =>
    request<Package[]>(token, '/packages/reorder', { method: 'PATCH', body: JSON.stringify({ ids }) }),

  menus: (token: string) => request<MenuItem[]>(token, '/menus'),

  createMenu: (token: string, input: Omit<MenuItem, 'id'>) =>
    request<MenuItem>(token, '/menus', { method: 'POST', body: JSON.stringify(input) }),

  updateMenu: (token: string, id: string, input: Partial<Omit<MenuItem, 'id'>>) =>
    request<MenuItem>(token, `/menus/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  deleteMenu: (token: string, id: string) => request<void>(token, `/menus/${id}`, { method: 'DELETE' }),

  /** ตามลิงก์ย่อ Google Maps (maps.app.goo.gl) ฝั่ง backend แล้วคืนลิงก์เต็มที่มีพิกัดอยู่ในตัว */
  resolveMapsLink: async (token: string, url: string): Promise<string> =>
    (await request<{ url: string }>(token, `/geo/resolve-maps-link?url=${encodeURIComponent(url)}`)).url,

  settings: async (token: string): Promise<AppSettings> =>
    toFrontendSettings(await request<BackendSettings>(token, '/settings')),

  /** ก่อน login — ใช้โชว์ชื่อร้าน/โลโก้/สีแบรนด์บนหน้า Login เท่านั้น ไม่ต้องใช้ token */
  publicShopInfo: async (): Promise<AppSettings['shopInfo'] & { brandColor: string }> => {
    const res = await fetch(`${API_BASE}/settings/public`)
    if (!res.ok) throw new Error(`API GET /settings/public -> ${res.status}`)
    const s = (await res.json()) as Pick<
      BackendSettings,
      | 'shopName'
      | 'shopNameEn'
      | 'shopInitials'
      | 'shopAddress'
      | 'shopPhone'
      | 'shopLine'
      | 'shopLogo'
      | 'shopLoginTagline'
      | 'brandColor'
    >
    return {
      name: s.shopName,
      nameEn: s.shopNameEn,
      initials: s.shopInitials,
      address: s.shopAddress,
      phone: s.shopPhone,
      line: s.shopLine,
      logo: s.shopLogo ?? '',
      loginTagline: s.shopLoginTagline ?? DEFAULT_SHOP_INFO.loginTagline,
      brandColor: s.brandColor ?? DEFAULT_BRAND_COLOR,
      // ข้อมูลบัญชี/QR ไม่ส่งมาจาก endpoint นี้ (ไม่มี auth) — เว้นว่างไว้ก่อน login
      bankName: '',
      bankAccountNumber: '',
      bankAccountName: '',
      promptPayQr: '',
    }
  },

  updateSettings: async (token: string, patch: Partial<AppSettings>): Promise<AppSettings> =>
    toFrontendSettings(
      await request<BackendSettings>(token, '/settings', {
        method: 'PATCH',
        body: JSON.stringify(toBackendSettingsPatch(patch)),
      }),
    ),
}
