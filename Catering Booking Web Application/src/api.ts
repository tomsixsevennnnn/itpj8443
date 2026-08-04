import type { AppSettings, Booking, MenuItem, Package, QueueBooking } from './types'
import { DEFAULT_CATEGORY_ORDER } from './data'

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
  depositRate: number
  deliveryFee: number
  freeDeliveryMinTables: number
  wageChef: number
  wageAssistant: number
  wageServerPerTable: number
  wageDishwasher: number
  categoryOrder: string[]
  shopLocationLat: number
  shopLocationLng: number
  fuelCostPerKm: number
}

const toFrontendSettings = (s: BackendSettings): AppSettings => ({
  shopInfo: {
    name: s.shopName,
    nameEn: s.shopNameEn,
    initials: s.shopInitials,
    address: s.shopAddress,
    phone: s.shopPhone,
    line: s.shopLine,
  },
  depositRate: s.depositRate,
  deliveryFee: s.deliveryFee,
  freeDeliveryMinTables: s.freeDeliveryMinTables,
  wageChef: s.wageChef,
  wageAssistant: s.wageAssistant,
  wageServerPerTable: s.wageServerPerTable,
  wageDishwasher: s.wageDishwasher,
  // เผื่อ backend เก่า/ยังไม่ migrate ที่ส่ง settings มาโดยไม่มีฟิลด์นี้ — กันหน้าแพ็กเกจ/เมนูพังทั้งหน้า
  categoryOrder: s.categoryOrder ?? DEFAULT_CATEGORY_ORDER,
  shopLocation: { lat: s.shopLocationLat, lng: s.shopLocationLng },
  fuelCostPerKm: s.fuelCostPerKm,
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
  if (patch.depositRate !== undefined) out.depositRate = patch.depositRate
  if (patch.deliveryFee !== undefined) out.deliveryFee = patch.deliveryFee
  if (patch.freeDeliveryMinTables !== undefined) out.freeDeliveryMinTables = patch.freeDeliveryMinTables
  if (patch.wageChef !== undefined) out.wageChef = patch.wageChef
  if (patch.wageAssistant !== undefined) out.wageAssistant = patch.wageAssistant
  if (patch.wageServerPerTable !== undefined) out.wageServerPerTable = patch.wageServerPerTable
  if (patch.wageDishwasher !== undefined) out.wageDishwasher = patch.wageDishwasher
  if (patch.categoryOrder !== undefined) out.categoryOrder = patch.categoryOrder
  if (patch.shopLocation?.lat !== undefined) out.shopLocationLat = patch.shopLocation.lat
  if (patch.shopLocation?.lng !== undefined) out.shopLocationLng = patch.shopLocation.lng
  if (patch.fuelCostPerKm !== undefined) out.fuelCostPerKm = patch.fuelCostPerKm
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
  packageName: string
  totalPrice: number
  pricePerTable?: number
  deliveryFee?: number
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

  menus: (token: string) => request<MenuItem[]>(token, '/menus'),

  createMenu: (token: string, input: Omit<MenuItem, 'id'>) =>
    request<MenuItem>(token, '/menus', { method: 'POST', body: JSON.stringify(input) }),

  updateMenu: (token: string, id: string, input: Partial<Omit<MenuItem, 'id'>>) =>
    request<MenuItem>(token, `/menus/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  deleteMenu: (token: string, id: string) => request<void>(token, `/menus/${id}`, { method: 'DELETE' }),

  settings: async (token: string): Promise<AppSettings> =>
    toFrontendSettings(await request<BackendSettings>(token, '/settings')),

  updateSettings: async (token: string, patch: Partial<AppSettings>): Promise<AppSettings> =>
    toFrontendSettings(
      await request<BackendSettings>(token, '/settings', {
        method: 'PATCH',
        body: JSON.stringify(toBackendSettingsPatch(patch)),
      }),
    ),
}
