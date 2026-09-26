import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { LayoutDashboard } from 'lucide-react'
import type { AppSettings, BookingData, Screen, UserProfile, Booking, EventLocation, MenuItem, Package, QueueBooking, ShopPublic } from './types'
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_ORDER, categoryMapOf, includedItems, orderedCategories } from './data'
import {
  DEFAULT_BOOKING_TERMS,
  DEFAULT_DEPOSIT_RATE,
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_QUOTATION_VALID_DAYS,
  DEFAULT_SHOP_INFO,
} from './documents'
import {
  DEFAULT_DELIVERY_FEE,
  DEFAULT_FREE_DELIVERY_MIN_TABLES,
  DEFAULT_FUEL_COST_PER_KM,
  DEFAULT_HOME_PROVINCE,
  DEFAULT_METRO_PROVINCES,
  DEFAULT_SHOP_LOCATION,
  formatFullAddress,
} from './geo'
import {
  DEFAULT_WAGE_ASSISTANT,
  DEFAULT_WAGE_CHEF,
  DEFAULT_WAGE_DISHWASHER,
  DEFAULT_WAGE_SERVER_PER_TABLE,
} from './costing'
import { DEFAULT_STAFF_RATIOS } from './staffing'
import { DEFAULT_SLOT_HOURS } from './availability'
import { DEFAULT_HOME_CONTENT } from './homeContent'
import { DEFAULT_NOTIF_SEEN_AT, unreadNotificationCount } from './notifications'
import { roleFromAuth0User } from './auth'
import {
  api,
  type BackendUser,
  type CreatePackageInput,
  type ShopAdmin,
  type UpdatePackageInput,
  type UploadImageKind,
} from './api'
import { usePolling } from './usePolling'
import { useBookingsStream } from './useBookingsStream'
import { useAppStream } from './useAppStream'
import { isSessionExpiredError } from './sessionExpired'
import ErrorBanner from './components/ErrorBanner'
import Login from './screens/Login'
import ShopSelect from './screens/ShopSelect'
import CompleteProfile from './screens/CompleteProfile'
import Home from './screens/Home'
import BookingCalendar from './screens/BookingCalendar'
import SelectTable from './screens/SelectTable'
import SelectLocation from './screens/SelectLocation'
import SelectPackage from './screens/SelectPackage'
import SelectMenu from './screens/SelectMenu'
import Cart from './screens/Cart'
import BookingHistory from './screens/BookingHistory'
import Notifications from './screens/Notifications'
import OwnerLayout, { OWNER_NOTIF_SEEN_KEY } from './components/OwnerLayout'
import { NavProvider, type NavContextValue } from './NavContext'
import { DEFAULT_BRAND_COLOR, applyBrandTheme } from './theme'
import Dashboard from './screens/owner/Dashboard'
import Orders from './screens/owner/Orders'
import CalendarView from './screens/owner/CalendarView'
import Packages from './screens/owner/Packages'
import Menus from './screens/owner/Menus'
import Documents from './screens/owner/Documents'
import Reports from './screens/owner/Reports'
import Settings from './screens/owner/Settings'
import PageContent from './screens/owner/PageContent'
import UserRoles from './screens/owner/UserRoles'
import AuditLog from './screens/owner/AuditLog'
import SuperAdmin from './screens/SuperAdmin'

const OWNER_SCREENS: Screen[] = [
  'owner-dashboard', 'owner-orders', 'owner-calendar', 'owner-packages', 'owner-menus', 'owner-documents',
  'owner-reports', 'owner-settings', 'owner-page-content', 'owner-users', 'owner-audit-log',
]

/** เก็บ per-browser — ร้านที่ลูกค้าเลือกไว้ล่าสุด กันต้องเลือกร้านซ้ำทุกครั้งที่กลับมาเปิดแอป (multi-tenant) */
const SELECTED_SHOP_KEY = 'selectedShopId'
const SELECTED_SHOP_SLUG_KEY = 'selectedShopSlug'

/** 6 ขั้นตอนการจอง — ออกจากช่วงนี้ไปหน้าอื่นผ่านแถบเมนูด้านบน (หน้าแรก/ประวัติการจอง) แล้วกลับมาต้องเริ่มเลือกใหม่ ไม่ resume ของเดิม */
const BOOKING_FLOW_SCREENS: Screen[] = [
  'booking-calendar', 'select-table', 'select-location', 'select-package', 'select-menu', 'cart',
]

type AppRoleForPath = 'owner' | 'customer' | 'super_admin'

/**
 * URL ต่อจากไฟล์นี้ทั้งหมด — แอปไม่มี router (แค่ useState<Screen> ตัวเดียว) เก็บ path mapping ไว้เป็นตารางเดียว
 * ตรงนี้ที่เดียว ให้ navigate()/bootstrap load effect/popstate handler ใช้ร่วมกัน กันสามจุดนั้นคำนวณ path ไม่ตรงกัน
 *  - ฝั่งลูกค้า (รวม 'login'/'home') อยู่ใต้ /{shopSlug} เสมอ เพราะร้านเลือกจาก URL ได้ (multi-tenant)
 *  - ฝั่งเจ้าของร้านอยู่ใต้ /owner/ ตรงๆ ไม่มี slug นำหน้า เพราะร้านผูกกับ account ไม่ใช่ URL
 *  - super admin มีแค่หน้าเดียว /super-admin
 */
const CUSTOMER_SCREEN_PATH: Partial<Record<Screen, string>> = {
  home: '',
  'booking-calendar': '/booking-calendar',
  'select-table': '/select-table',
  'select-location': '/select-location',
  'select-package': '/select-package',
  'select-menu': '/select-menu',
  cart: '/cart',
  history: '/history',
  notifications: '/notifications',
}
const OWNER_SCREEN_PATH: Partial<Record<Screen, string>> = {
  'owner-dashboard': '/owner/dashboard',
  'owner-orders': '/owner/orders',
  'owner-calendar': '/owner/calendar',
  'owner-packages': '/owner/packages',
  'owner-menus': '/owner/menus',
  'owner-documents': '/owner/documents',
  'owner-reports': '/owner/reports',
  'owner-settings': '/owner/settings',
  'owner-page-content': '/owner/page-content',
  'owner-users': '/owner/users',
  'owner-audit-log': '/owner/audit-log',
}
const OWNER_PATH_TO_SCREEN: Record<string, Screen> = Object.fromEntries(
  Object.entries(OWNER_SCREEN_PATH).map(([s, p]) => [p, s as Screen]),
)
const CUSTOMER_PATH_TO_SCREEN: Record<string, Screen> = Object.fromEntries(
  Object.entries(CUSTOMER_SCREEN_PATH).map(([s, p]) => [p, s as Screen]),
)

const defaultScreenFor = (r: AppRoleForPath): Screen =>
  r === 'owner' ? 'owner-dashboard' : r === 'super_admin' ? 'super-admin' : 'home'

/**
 * screen + ร้านปัจจุบัน -> URL ที่ "ควรจะเป็น" ใช้ตอน navigate() (pushState) และตอน sync URL ทุกจุด — ตัดสินจาก
 * "ตัว screen เอง" อยู่ในผังไหน ไม่ใช่จาก role ตรงๆ เพราะ owner กด "มุมมองลูกค้า" แล้ว screen เป็นหน้าลูกค้า
 * (เช่น 'home'/'cart') ได้ทั้งที่ role ยังเป็น owner อยู่ — ถ้าตัดสินจาก role จะได้ path เจ้าของร้านผิดๆ ทับไป
 */
const pathForScreen = (s: Screen, shopSlug: string | null): string => {
  if (s === 'super-admin') return '/super-admin'
  if (OWNER_SCREEN_PATH[s] !== undefined) return OWNER_SCREEN_PATH[s]!
  // ฝั่งลูกค้า (รวม 'login' และหน้าลูกค้าที่ owner กำลัง preview อยู่) — อยู่ใต้ /{slug} เสมอ ยังไม่มี slug
  // (ยังไม่เลือกร้าน) ใช้ / ไปก่อน
  const suffix = CUSTOMER_SCREEN_PATH[s] ?? ''
  return shopSlug ? `/${shopSlug}${suffix}` : '/'
}

/**
 * อ่าน path ปัจจุบันแล้วแปลงกลับเป็น Screen ตาม role — คืน null ถ้า path นี้ไม่มีหน้าไหนให้ role นี้เข้าได้เลย
 * (เช่น customer เปิด /owner/orders เอง) ให้ผู้เรียกใช้ fallback ไปหน้า default ของ role เองแทนที่จะเชื่อ URL ตรงๆ
 * — จุดนี้คือ guard ความปลอดภัยหลัก กัน URL ที่พิมพ์/ค้างมาเองพา role ผิดไปเห็นหน้าที่ไม่ใช่ของตัวเอง: เฉพาะ owner
 * เท่านั้นที่ resolve เป็นหน้า /owner/* ได้ ส่วนหน้าฝั่งลูกค้า (/{slug}/...) ทั้ง owner (preview) และ customer
 * resolve ได้ทั้งคู่ เพราะ owner มีสิทธิ์ดูหน้าลูกค้าอยู่แล้ว (ปุ่ม "มุมมองลูกค้า")
 */
const screenFromPath = (pathname: string, r: AppRoleForPath): Screen | null => {
  const clean = '/' + pathname.replace(/^\/+|\/+$/g, '')
  if (clean === '/super-admin') return r === 'super_admin' ? 'super-admin' : null
  if (r === 'super_admin') return null // super admin ไม่มีหน้าอื่นให้ resolve นอกจาก /super-admin

  const ownerScreen = OWNER_PATH_TO_SCREEN[clean]
  if (ownerScreen) return r === 'owner' ? ownerScreen : null

  // เหลือ path แบบฝั่งลูกค้า (/{slug}/...) — ตัด segment แรก (สมมติว่าเป็น shop slug) ออกก่อนเสมอ ไม่สนว่าตรงกับ
  // ร้านปัจจุบันไหม (ผู้เรียกเป็นคนบังคับ slug ที่ถูกต้องกลับเข้าไปตอนสร้าง URL จริงผ่าน pathForScreen แยกต่างหาก)
  const segments = clean.split('/').filter(Boolean)
  const subPath = segments.length > 1 ? '/' + segments.slice(1).join('/') : ''
  return CUSTOMER_PATH_TO_SCREEN[subPath] ?? null
}

const initialSettings: AppSettings = {
  // ค่าเริ่มต้นก่อนโหลดจริงจาก backend — ตัวจริงจะมาแทนที่หลัง GET /settings เสมอ ห้ามใช้ค่านี้บันทึกจริง
  version: 0,
  shopInfo: DEFAULT_SHOP_INFO,
  depositRate: DEFAULT_DEPOSIT_RATE,
  deliveryFee: DEFAULT_DELIVERY_FEE,
  freeDeliveryMinTables: DEFAULT_FREE_DELIVERY_MIN_TABLES,
  metroProvinces: DEFAULT_METRO_PROVINCES,
  homeProvince: DEFAULT_HOME_PROVINCE,
  brandColor: DEFAULT_BRAND_COLOR,
  wageChef: DEFAULT_WAGE_CHEF,
  wageAssistant: DEFAULT_WAGE_ASSISTANT,
  wageServerPerTable: DEFAULT_WAGE_SERVER_PER_TABLE,
  wageDishwasher: DEFAULT_WAGE_DISHWASHER,
  tablesPerServer: DEFAULT_STAFF_RATIOS.tablesPerServer,
  tablesPerSupport: DEFAULT_STAFF_RATIOS.tablesPerSupport,
  staffRemainderThreshold: DEFAULT_STAFF_RATIOS.staffRemainderThreshold,
  timeSlotHours: DEFAULT_SLOT_HOURS,
  quotationValidDays: DEFAULT_QUOTATION_VALID_DAYS,
  quotationTerms: DEFAULT_QUOTATION_TERMS,
  bookingTerms: DEFAULT_BOOKING_TERMS,
  categories: DEFAULT_CATEGORIES,
  categoryOrder: DEFAULT_CATEGORY_ORDER,
  closedDates: [],
  shopLocation: DEFAULT_SHOP_LOCATION,
  fuelCostPerKm: DEFAULT_FUEL_COST_PER_KM,
  homeContent: DEFAULT_HOME_CONTENT,
}

/** ทางหลักที่ทำให้ settings/เมนู-แพ็กเกจ-คิวช่วงเวลา/bookings เห็นการเปลี่ยนแปลงแบบ realtime คือ SSE
 *  (useAppStream + useBookingsStream ด้านล่าง) — ค่า poll ที่เหลือนี้เป็นแค่ fallback เผื่อ SSE เชื่อมต่อไม่ได้
 *  (เช่น proxy/network บาง setup ไม่รองรับ event stream) จึง poll ห่างๆ พอ */
const SETTINGS_POLL_MS = 60_000
const BOOKINGS_POLL_MS = 60_000
const CATALOG_POLL_MS = 60_000
/** เก็บ per-browser ไม่ใช่ per-account — ต้องล้างตอน logout ไม่งั้นลูกค้าคนถัดไปที่ใช้เครื่องเดียวกันจะเห็นค่าเก่าค้าง */
const CUSTOMER_NOTIF_SEEN_KEY = 'customerNotifSeenAt'

const initialBooking: BookingData = {
  date: null,
  timeSlot: null,
  tables: 2,
  guestCount: 20,
  location: null,
  packageId: null,
  packageName: null,
  packagePrice: 0,
  menuLimit: 9,
  selectedMenus: [],
}

export default function App() {
  const { isAuthenticated, isLoading, user: auth0User, logout, getAccessTokenSilently } = useAuth0()
  const [screen, setScreen] = useState<Screen>('login')
  const [booking, setBooking] = useState<BookingData>(initialBooking)
  // รายการจองทั้งหมด — ใช้ร่วมกันทั้งปฏิทินร้าน ประวัติ และเอกสาร (owner เห็นทุกใบจอง, customer เห็นเฉพาะของตัวเอง)
  const [bookings, setBookings] = useState<Booking[]>([])
  // คิวรับงานของ "ทุกลูกค้า" แบบไม่มีข้อมูลส่วนตัว — ใช้เฉพาะหน้าเลือกวันจัดงาน กันลูกค้าเลือกวันที่คนอื่นจองเต็มไปแล้ว
  const [availability, setAvailability] = useState<QueueBooking[]>([])
  // แพ็กเกจและคลังเมนูอยู่ที่นี่ เพื่อให้เจ้าของร้านแก้แล้วฝั่งลูกค้าเห็นผลทันที
  const [packages, setPackages] = useState<Package[]>([])
  const [menus, setMenus] = useState<MenuItem[]>([])
  // ค่าตั้งค่าร้าน — แก้ได้จากหน้า "ตั้งค่า" ฝั่งเจ้าของร้าน มีผลกับค่าขนส่ง มัดจำ และข้อมูลบนเอกสารทันที
  const [settings, setSettings] = useState<AppSettings>(initialSettings)

  // ร้านที่ลูกค้าเลือกไว้ (multi-tenant) — ต้องเลือกก่อนถึงจะ login/จองได้ owner/super admin ไม่ใช้ค่านี้เลย
  // เพราะ backend resolve ร้านของ owner เองจาก JWT อยู่แล้ว จำไว้ใน localStorage กันต้องเลือกซ้ำทุกครั้งที่เปิดแอป
  // เก็บ slug คู่กับ id ไว้ด้วย (ไม่ได้ใช้ยิง API ไหนเลย แค่เอาไว้ sync URL กลับให้ตรงร้านที่เลือกไว้จริง เผื่อ URL
  // เพี้ยนไป เช่น ลูกค้าพิมพ์ path ร้านอื่นเข้ามาเองขณะที่ยัง login ค้างอยู่ — ดู bootstrap load effect ด้านล่าง)
  const [selectedShopId, setSelectedShopId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SELECTED_SHOP_KEY)
    } catch {
      return null
    }
  })
  const [selectedShopSlug, setSelectedShopSlug] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SELECTED_SHOP_SLUG_KEY)
    } catch {
      return null
    }
  })
  /** เซ็ต state + localStorage ของร้านที่เลือกไว้ ไม่แตะ URL/history เลย — ใช้ตอน sync จาก popstate (ปุ่ม
   *  back/forward ของเบราว์เซอร์) ที่ URL เปลี่ยนไปแล้วจริงๆ โดยเบราว์เซอร์เอง ไม่ควร push ซ้ำอีกชั้น */
  const applySelectedShop = (shop: ShopPublic | null) => {
    setSelectedShopId(shop?.id ?? null)
    setSelectedShopSlug(shop?.slug ?? null)
    try {
      if (shop) {
        localStorage.setItem(SELECTED_SHOP_KEY, shop.id)
        localStorage.setItem(SELECTED_SHOP_SLUG_KEY, shop.slug)
      } else {
        localStorage.removeItem(SELECTED_SHOP_KEY)
        localStorage.removeItem(SELECTED_SHOP_SLUG_KEY)
      }
    } catch {
      // เพิกเฉยได้ถ้า localStorage ใช้งานไม่ได้ (เช่น private mode)
    }
  }

  /** เลือกร้าน (จาก ShopSelect หรือ resolve จาก URL slug ตอน mount) — เก็บ id ไว้ทำงานจริง แล้วอัปเดต URL เป็น
   *  /{slug} ด้วย ให้ก็อปปี้ลิงก์ตรงร้านนั้นไปแชร์ต่อได้เลย (ดู resolveShopFromUrl effect ด้านล่าง) */
  const handleSelectShop = (shop: ShopPublic) => {
    applySelectedShop(shop)
    try {
      window.history.pushState(null, '', `/${shop.slug}`)
    } catch {
      // เพิกเฉยได้ถ้า History API ใช้ไม่ได้ (ไม่น่าเกิดในเบราว์เซอร์จริง) — แค่ URL ไม่อัปเดตตาม ใช้งานต่อได้ปกติ
    }
  }

  /** กด "เปลี่ยนร้าน" ที่หน้า login — เคลียร์ทั้ง state, localStorage และ URL กันเผลอค้างร้านเดิมไว้ */
  const handleChangeShop = () => {
    applySelectedShop(null)
    try {
      window.history.pushState(null, '', '/')
    } catch {
      // เพิกเฉยได้ถ้า History API ใช้ไม่ได้
    }
  }

  // resolve ร้านจาก URL path ตอนเปิดแอปครั้งแรก (เช่นเปิดลิงก์ที่แชร์มา /pipat-catering) — ให้ข้ามหน้าเลือกร้านไปเลย
  // เฉพาะตอน "ยังไม่ได้ login" เท่านั้น — รอ Auth0 เช็ค session ค้าง (isLoading) ให้เสร็จก่อนเสมอ ถ้า login อยู่แล้ว
  // (owner ที่มี session ค้าง หรือลูกค้าที่ SSO ผ่านมา) ให้ยึดร้านตาม account เดิมเป็นหลัก ไม่ใช้ URL ทับ กัน race กับ
  // bootstrap load effect ด้านล่างที่ sync URL ให้ตรงร้านของ owner เอง (ไม่งั้นสอง effect แย่งกันเขียน URL/
  // selectedShopId พอ resolve จาก URL เสร็จทีหลังจะไปทับร้านที่ถูกต้องอยู่แล้วด้วยร้านอื่นตาม URL เดิมที่ค้างอยู่)
  const [resolvingShopFromUrl, setResolvingShopFromUrl] = useState(
    () => window.location.pathname.replace(/^\/+|\/+$/g, '').length > 0,
  )
  const resolvedShopFromUrlRef = useRef(false)
  useEffect(() => {
    if (isLoading || resolvedShopFromUrlRef.current) return
    resolvedShopFromUrlRef.current = true

    const slug = window.location.pathname.replace(/^\/+|\/+$/g, '')
    if (!slug || isAuthenticated) {
      setResolvingShopFromUrl(false)
      return
    }
    api
      .shopBySlugPublic(slug)
      .then(shop => handleSelectShop(shop))
      .catch(() => {
        // ไม่พบร้านนี้ หรือร้านปิดให้บริการ — เคลียร์ path ทิ้ง กลับไปหน้าเลือกร้านปกติแทนที่จะค้าง URL ที่ใช้ไม่ได้
        try {
          window.history.replaceState(null, '', '/')
        } catch {
          // เพิกเฉยได้
        }
      })
      .finally(() => setResolvingShopFromUrl(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated])

  const [notifSeenAt, setNotifSeenAt] = useState<string>(() => {
    try {
      return localStorage.getItem(CUSTOMER_NOTIF_SEEN_KEY) ?? DEFAULT_NOTIF_SEEN_AT
    } catch {
      return DEFAULT_NOTIF_SEEN_AT
    }
  })
  // ค่า notifSeenAt "ก่อนหน้า" ที่ freeze ไว้ตอนเข้าหน้าแจ้งเตือนรอบนี้ — ใช้ตัดสินป้าย "ยังไม่อ่าน" รายรายการ
  // ในหน้านั้นเอง (โชว์สิ่งที่ใหม่ตั้งแต่ครั้งก่อนที่เปิดดู) แยกจาก notifSeenAt ที่อัปเดตทันทีเพื่อให้ตัวเลขที่กระดิ่งหายทันที
  const [notifPageSeenAt, setNotifPageSeenAt] = useState(notifSeenAt)
  // ใบจองที่คลิกมาจากการ์ดแจ้งเตือน — พอ Orders/BookingHistory เจอใบจองนี้ในหน้าตัวเองแล้วจะเปิด detail ให้อัตโนมัติ
  // แล้วเคลียร์ค่านี้ทิ้งทันที (onOpenBookingIdHandled) กันเปิดซ้ำเวลากลับมาหน้าเดิมทีหลังโดยไม่ได้ตั้งใจ
  const [pendingNotifBookingId, setPendingNotifBookingId] = useState<string | null>(null)

  // ชื่อ tab เบราว์เซอร์ — title ใน index.html มาจาก .figma/make/site.json (static ตอน build)
  // ก่อน login หน้า Login เป็นคนดึง/ตั้ง title เอง (ดู screens/Login.tsx) ส่วนนี้ sync ต่อหลัง login โหลดเสร็จ
  // และทุกครั้งที่ settings อัปเดตจาก polling ด้านล่าง
  useEffect(() => {
    document.title = settings.shopInfo.name || document.title
  }, [settings.shopInfo.name])
  // ทาสีแบรนด์ทับ Tailwind ทั้งแอปทันทีที่ settings โหลดเสร็จ/เปลี่ยน (รวมถึงตอน polling settings ด้านล่างเจอค่าที่แก้จากเครื่องอื่น)
  useEffect(() => {
    applyBrandTheme(settings.brandColor)
  }, [settings.brandColor])
  // โปรไฟล์ผู้ใช้จาก backend (ผูกกับ Auth0 sub) — เป็นแหล่งความจริงเดียวของ user profile
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  // แจ้งเตือนลอยตอนทำรายการ (จอง/แก้แพ็กเกจ/แก้เมนู ฯลฯ) ไม่สำเร็จ — คนละเรื่องกับ loadError ที่บล็อกทั้งหน้า
  const [actionError, setActionError] = useState<string | null>(null)

  /**
   * แอปนี้ไม่มี router — ทุก pushState/replaceState ในไฟล์นี้แค่ทำให้ URL "ดูตรง" กับสถานะปัจจุบัน ไม่เคยมีอะไรฟัง
   * popstate เลย กดปุ่ม back/forward ของเบราว์เซอร์เลยเห็น URL เปลี่ยนแต่หน้าจอไม่ขยับตาม (เพราะ React ไม่รู้ตัว)
   * เพิ่ม listener นี้ให้ตอบสนองปุ่ม back/forward เท่าที่แอประดับนี้ทำได้จริง:
   *  - login อยู่แล้ว (owner/customer/super admin) → ร้านผูกกับ account/session ตายตัว ไม่ใช่ URL ไม่ยอมให้
   *    back/forward เปลี่ยนร้านได้ แต่ "หน้าจอ" (screen) ภายในร้าน/ระบบของตัวเองสลับได้ตาม URL จริง — resolve ผ่าน
   *    screenFromPath (role-aware) เจอ path ที่ไม่มีจริงสำหรับ role นี้ (พิมพ์เอง/ค้างจาก session อื่น) ก็แก้ URL
   *    กลับไปที่ path ของหน้าปัจจุบันแทนที่จะปล่อยค้างผิด
   *  - ยังไม่ login → ให้ back/forward สลับ "หน้าเลือกร้าน" กับ "หน้า login ของร้านที่เคยเลือก" ได้จริง
   *    (อ่าน URL ใหม่แล้ว resolve ร้านใหม่ตามนั้น โดยไม่ push ซ้ำ เพราะเบราว์เซอร์เปลี่ยน URL ให้เองแล้ว)
   */
  useEffect(() => {
    const onPopState = () => {
      if (isAuthenticated) {
        const roleForPath: AppRoleForPath =
          backendUser?.role === 'OWNER' ? 'owner' : backendUser?.role === 'SUPER_ADMIN' ? 'super_admin' : 'customer'
        const shopSlug = roleForPath === 'owner' ? (backendUser?.shop?.slug ?? null) : selectedShopSlug

        const resolved = screenFromPath(window.location.pathname, roleForPath)
        if (resolved) {
          if (BOOKING_FLOW_SCREENS.includes(screen) && !BOOKING_FLOW_SCREENS.includes(resolved)) {
            setBooking(initialBooking)
          }
          setScreen(resolved)
          return
        }
        // path นี้ไม่มีจริงสำหรับ role นี้ — คงหน้าปัจจุบันไว้ แค่แก้ URL ให้ตรงกับหน้าที่ยังแสดงอยู่จริง
        try {
          window.history.replaceState(null, '', pathForScreen(screen, shopSlug))
        } catch {
          // เพิกเฉยได้
        }
        return
      }

      const slug = window.location.pathname.replace(/^\/+|\/+$/g, '')
      if (!slug) {
        applySelectedShop(null)
        return
      }
      api.shopBySlugPublic(slug).then(applySelectedShop).catch(() => {
        try {
          window.history.replaceState(null, '', '/')
        } catch {
          // เพิกเฉยได้
        }
        applySelectedShop(null)
      })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isAuthenticated, backendUser, selectedShopSlug, screen])

  // รายชื่อร้านทั้งหมด (พร้อมจำนวน owner) และ owner ทุกคนข้ามทุกร้าน — เฉพาะ super admin เท่านั้นที่เห็น/ใช้หน้า super-admin
  const [shopsAdmin, setShopsAdmin] = useState<ShopAdmin[]>([])
  const [ownersAdmin, setOwnersAdmin] = useState<BackendUser[]>([])

  // resolve หน้าเริ่มต้นจาก URL ครั้งเดียวตอน login สำเร็จรอบแรก (เช่น reload หน้ากลางทางที่ /owner/orders ต้องกลับ
  // มาหน้าเดิม ไม่ใช่เด้งไป dashboard) — ครั้งถัดๆ ไปที่ effect นี้ทำงานซ้ำ (retryKey/selectedShopId เปลี่ยน) ไม่ต้อง
  // ทำอีก เพราะ `screen` ถูกคุมด้วย navigate()/popstate ไปแล้วจากตรงนี้เป็นต้นไป
  const initialScreenResolvedRef = useRef(false)

  /**
   * โหลดข้อมูลทั้งหมดจาก backend ทันทีที่ login สำเร็จ — sync user ก่อนเสมอเพื่อรู้ role/shopId จริง แล้วค่อยแยก
   * โหลดต่อตาม role: super admin ไม่ผูกร้านไหนเลย โหลดแค่รายชื่อร้าน, owner/customer โหลด bookings/packages/menus/
   * settings ของร้านที่เกี่ยวข้อง (owner = ร้านตัวเอง จาก JWT, customer = ร้านที่เลือกไว้ผ่าน selectedShopId)
   */
  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false

    const load = async () => {
      setLoadError(null)
      try {
        const token = await getAccessTokenSilently()
        // access token ไม่มี name/email/picture ให้ (มีแค่ role claim) — ส่งจาก ID token ฝั่งนี้แทน
        const me = await api.syncProfile(token, {
          name: auth0User?.given_name || auth0User?.name?.split(' ')[0] || 'ผู้ใช้',
          surname: auth0User?.family_name || auth0User?.name?.split(' ').slice(1).join(' ') || '',
          email: auth0User?.email ?? '',
          avatar: auth0User?.picture ?? '',
        })
        if (cancelled) return
        setBackendUser(me)

        const roleForPath: AppRoleForPath = me.role === 'OWNER' ? 'owner' : me.role === 'SUPER_ADMIN' ? 'super_admin' : 'customer'
        // sync หน้าเริ่มต้น + URL ให้ตรงกับ role/ร้านของ session ปัจจุบันเสมอ (ครั้งแรกที่ login สำเร็จเท่านั้น
        // ดู initialScreenResolvedRef) resolve จาก URL ปัจจุบันก่อน (รองรับ deep-link/reload กลางทาง) ถ้าไม่ตรง
        // หน้าไหนของ role นี้เลย ค่อย fallback ไปหน้า default — กันเคส login ค้างอยู่แล้วมีใครพิมพ์ path ร้าน/
        // หน้าอื่นเข้ามาเอง ให้ดีดกลับมาร้าน/หน้าที่ถูกต้องของ session นี้เสมอ ไม่ใช่ปล่อยให้ URL ค้างผิดไว้
        if (!initialScreenResolvedRef.current) {
          initialScreenResolvedRef.current = true
          const shopSlugForPath = roleForPath === 'owner' ? (me.shop?.slug ?? null) : selectedShopSlug
          const resolved = screenFromPath(window.location.pathname, roleForPath)
          const targetScreen = resolved ?? defaultScreenFor(roleForPath)
          setScreen(targetScreen)
          try {
            window.history.replaceState(null, '', pathForScreen(targetScreen, shopSlugForPath))
          } catch {
            // เพิกเฉยได้ถ้า History API ใช้ไม่ได้
          }
        }

        if (me.role === 'SUPER_ADMIN') {
          const [shops, owners] = await Promise.all([api.shopsList(token), api.listOwners(token)])
          if (cancelled) return
          setShopsAdmin(shops)
          setOwnersAdmin(owners)
          setDataLoaded(true)
          return
        }

        const shopId = me.role === 'OWNER' ? me.shopId : selectedShopId
        if (!shopId) {
          // ลูกค้าที่มี session ค้างอยู่ (Auth0 SSO) แต่ยังไม่ได้เลือกร้านในเครื่อง/เบราว์เซอร์นี้ (เช่นล้าง
          // localStorage ไปแล้ว) — ปล่อยให้ effectiveScreen ด้านล่างเด้งไปหน้าเลือกร้านแทน ไม่ fetch อะไรต่อ
          setDataLoaded(true)
          return
        }

        const [bks, avail, pkgs, mns, sttgs] = await Promise.all([
          api.bookings(token),
          api.bookingsAvailability(token, shopId),
          api.packages(token, shopId),
          api.menus(token, shopId),
          api.settings(token, shopId),
        ])
        if (cancelled) return
        setBookings(bks)
        setAvailability(avail)
        setPackages(pkgs)
        setMenus(mns)
        setSettings(sttgs)
        setDataLoaded(true)
      } catch (err) {
        if (cancelled) return
        // session/token หมดอายุ — เด้งกลับหน้า login แทนที่จะโชว์หน้า error ให้กด "ลองใหม่" วนไม่รู้จบ
        if (isSessionExpiredError(err)) {
          forceLogout()
          return
        }
        setLoadError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, getAccessTokenSilently, auth0User, retryKey, selectedShopId, selectedShopSlug])

  const withToken = () => getAccessTokenSilently()

  /** เคลียร์ session ของ Auth0 SDK แล้วเด้งกลับหน้า login — ใช้ทั้งตอนกดปุ่ม "ออกจากระบบ" และตอน token/session
   *  หมดอายุระหว่างใช้งาน (getAccessTokenSilently ขอ token ใหม่ไม่ได้ หรือ backend ตอบ 401) */
  const forceLogout = () => {
    // cacheLocation="localstorage" (main.tsx) แปลว่า session ของ Auth0 SDK เองก็อยู่ใน localStorage —
    // ปกติ logout() จะล้างให้ แต่ถ้ามี request ค้าง (เช่น token refresh) ชนกับตอน logout อาจเขียนทับกลับมาได้
    // ล้างเองซ้ำให้ชัวร์ก่อน redirect กันเคส "ออกจากระบบแล้วกลับเข้ามาเจอ session เดิมของ owner ค้างอยู่"
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('@@auth0spajs@@'))
        .forEach(key => localStorage.removeItem(key))
      localStorage.removeItem(OWNER_NOTIF_SEEN_KEY)
      localStorage.removeItem(CUSTOMER_NOTIF_SEEN_KEY)
    } catch {
      // เพิกเฉยได้ถ้า localStorage ใช้งานไม่ได้ (เช่น private mode)
    }
    logout({ logoutParams: { returnTo: window.location.origin } })
  }

  /** อัปโหลดรูป (data URL) ไปเก็บเป็นไฟล์บน backend แล้วคืน path สั้นๆ — ใช้แทนการเก็บ data URL ดิบในฟิลด์ image/logo/qr/slip */
  const handleUploadImage = (kind: UploadImageKind, dataUrl: string) =>
    withToken()
      .then(token => api.uploadImage(token, kind, dataUrl))
      .catch(err => {
        if (isSessionExpiredError(err)) forceLogout()
        throw err
      })

  /** ดึงรูปสลิปโอนเงินมาเป็น object URL — ต้องแนบ token เพราะไม่ใช่ static asset สาธารณะ (ดู useAuthedSlipUrl.ts) */
  const handleFetchPaymentSlip = (bookingId: string) =>
    withToken()
      .then(token => api.fetchPaymentSlip(token, bookingId))
      .catch(err => {
        if (isSessionExpiredError(err)) forceLogout()
        throw err
      })

  // ร้านที่เกี่ยวข้องกับผู้ใช้ปัจจุบัน — owner = ร้านตัวเอง, customer = ร้านที่เลือกไว้, super admin ไม่มี (null)
  const activeShopId = backendUser?.role === 'OWNER' ? backendUser.shopId : backendUser?.role === 'CUSTOMER' ? selectedShopId : null

  const refetchSettings = () => {
    if (!activeShopId) return
    withToken()
      .then(token => api.settings(token, activeShopId))
      .then(setSettings)
      .catch(() => {})
  }

  const refetchCatalog = () => {
    if (!activeShopId) return
    withToken()
      .then(token =>
        Promise.all([
          api.bookingsAvailability(token, activeShopId),
          api.packages(token, activeShopId),
          api.menus(token, activeShopId),
        ]),
      )
      .then(([avail, pkgs, mns]) => {
        setAvailability(avail)
        setPackages(pkgs)
        setMenus(mns)
      })
      .catch(() => {})
  }

  const refetchBookings = () => {
    if (backendUser?.role === 'SUPER_ADMIN') return
    withToken()
      .then(token => api.bookings(token))
      .then(setBookings)
      .catch(() => {})
  }

  // นับรอบเพิ่มทุกครั้งที่ backend แจ้งว่าประวัติการแก้ไข/สิทธิ์ผู้ใช้เปลี่ยน — ส่งเป็น prop ให้ AuditLog/UserRoles
  // ใช้เป็น dependency สั่ง refetch เอง เพราะข้อมูลสองส่วนนี้เป็น state ภายในหน้านั้น ไม่ได้ยกขึ้นมาไว้ที่ App
  const [auditRefreshSignal, setAuditRefreshSignal] = useState(0)
  const [usersRefreshSignal, setUsersRefreshSignal] = useState(0)

  // poll ค่าตั้งค่าร้าน/เมนู-แพ็กเกจ-คิวช่วงเวลาจองห่างๆ หลัง login (หยุดพักตอนสลับแท็บ) — เป็นแค่ fallback เผื่อ
  // useAppStream (SSE) ด้านล่างเชื่อมต่อไม่ได้ ทางหลักที่ทำให้เห็นการเปลี่ยนแปลงเกือบทันทีคือ SSE
  usePolling(() => {
    if (!isAuthenticated) return
    refetchSettings()
  }, SETTINGS_POLL_MS)

  usePolling(() => {
    if (!isAuthenticated || !dataLoaded) return
    refetchCatalog()
  }, CATALOG_POLL_MS)

  // SSE — backend ยิงสัญญาณทันทีที่มีการจอง/แก้ไขใบจอง (ดู backend/src/realtime) ให้ owner เห็นรายการจองใหม่
  // แทบจะทันทีโดยไม่ต้อง refresh เอง แทนที่จะรอ poll รอบถัดไป
  useBookingsStream(isAuthenticated && dataLoaded, withToken, refetchBookings)

  // SSE ช่องรวมของหัวข้ออื่น — settings/เมนู-แพ็กเกจ/สิทธิ์ผู้ใช้/ประวัติการแก้ไข เปลี่ยนจากเครื่อง/แท็บไหนก็ตาม
  // เห็นผลแทบจะทันทีเหมือนกัน แทนที่จะรอ poll รอบถัดไป (ดู useAppStream.ts + backend/src/audit/audit.service.ts
  // ที่เป็นจุดเดียวที่ยิงสัญญาณนี้ออกมา เพราะทุก mutation ที่เกี่ยวข้องเรียก audit.log() อยู่แล้ว)
  useAppStream(isAuthenticated && dataLoaded, withToken, topic => {
    if (topic === 'settings') refetchSettings()
    else if (topic === 'catalog') refetchCatalog()
    else if (topic === 'audit') setAuditRefreshSignal(v => v + 1)
    else if (topic === 'users') setUsersRefreshSignal(v => v + 1)
    else if (topic === 'shop') {
      // ร้าน (ชื่อ/slug/สถานะ/owner) ถูกแก้ไข/ลบที่ไหนก็ตามในระบบ — ใครก็ตามที่เปิดหน้าอยู่ตอนนั้นต้องเห็นผล
      // ทันที ไม่ใช่แค่คนที่กดเอง: super admin เห็นทุกร้านอยู่แล้ว refetch รายชื่อร้าน/owner ตรงๆ พอ ส่วน
      // owner/customer ต้อง sync role/shopId ใหม่ทั้งชุด (เผื่อร้านตัวเองถูกลบ/ระงับ/เปลี่ยนชื่อ/เปลี่ยน owner)
      // ใช้ retryKey บังคับให้ bootstrap load effect ด้านบนรันใหม่ทั้งหมดเหมือนกดปุ่ม "ลองใหม่" เอง
      if (backendUser?.role === 'SUPER_ADMIN') {
        withToken()
          .then(token => Promise.all([api.shopsList(token), api.listOwners(token)]))
          .then(([shops, owners]) => {
            setShopsAdmin(shops)
            setOwnersAdmin(owners)
          })
          .catch(() => {})
      } else {
        setRetryKey(v => v + 1)
      }
    }
  })

  // fallback poll ห่างๆ เผื่อ SSE เชื่อมต่อไม่ได้ — เช็ค dataLoaded กันยิง request ซ้อนกับตอนโหลดครั้งแรกที่ยังไม่เสร็จ
  usePolling(() => {
    if (!isAuthenticated || !dataLoaded) return
    refetchBookings()
  }, BOOKINGS_POLL_MS)

  /** ห่อ handler ที่ยิง API ทุกตัว — ถ้า error ให้เด้ง banner แจ้งผู้ใช้แทนที่จะเงียบ/พังไม่รู้สาเหตุ */
  const runAction = async (fn: () => Promise<void>) => {
    try {
      setActionError(null)
      await fn()
    } catch (err) {
      // session/token หมดอายุระหว่างใช้งาน — เด้งกลับหน้า login แทนที่จะโชว์ banner error เฉยๆ
      if (isSessionExpiredError(err)) {
        forceLogout()
        return
      }
      setActionError(err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง')
    }
  }

  /** เพิ่มหรือแก้ไขเมนู — ถ้าแก้ของเดิม ให้ซิงก์เข้าไปในแพ็กเกจที่ใช้เมนูนี้อยู่ด้วย */
  const handleSaveMenu = (item: MenuItem) =>
    runAction(async () => {
      const token = await withToken()
      const isExisting = menus.some(m => m.id === item.id)
      const input = {
        name: item.name,
        category: item.category,
        description: item.description,
        image: item.image,
        imagePosition: item.imagePosition,
        imageScale: item.imageScale,
        costPrice: item.costPrice,
        active: item.active,
      }
      const saved = isExisting ? await api.updateMenu(token, item.id, input) : await api.createMenu(token, input)

      setMenus(prev => (isExisting ? prev.map(m => (m.id === saved.id ? saved : m)) : [...prev, saved]))
      setPackages(prev =>
        prev.map(p => ({
          ...p,
          courses: p.courses.map(c => ({
            ...c,
            items: c.items.map(i => (i.id === saved.id ? saved : i)),
          })),
        }))
      )
    })

  /** ลบเมนูออกจากคลัง พร้อมถอดออกจากทุกแพ็กเกจที่ใช้อยู่ */
  const handleDeleteMenu = (id: string) =>
    runAction(async () => {
      const token = await withToken()
      await api.deleteMenu(token, id)
      setMenus(prev => prev.filter(m => m.id !== id))
      setPackages(prev =>
        prev.map(p => ({
          ...p,
          courses: p.courses.map(c => ({ ...c, items: c.items.filter(i => i.id !== id) })),
        }))
      )
    })

  const handleCreatePackage = (input: CreatePackageInput) =>
    runAction(async () => {
      const token = await withToken()
      const created = await api.createPackage(token, input)
      setPackages(prev => [...prev, created])
    })

  const handleUpdatePackage = (id: string, input: UpdatePackageInput) =>
    runAction(async () => {
      const token = await withToken()
      const updated = await api.updatePackage(token, id, input)
      setPackages(prev => prev.map(p => (p.id === id ? updated : p)))
    })

  const handleDeletePackage = (id: string) =>
    runAction(async () => {
      const token = await withToken()
      await api.deletePackage(token, id)
      setPackages(prev => prev.filter(p => p.id !== id))
    })

  const handleReorderPackages = (ids: string[]) =>
    runAction(async () => {
      // จัดเรียงในจอทันทีตอนลากวาง ไม่ต้องรอ backend ตอบก่อนถึงจะเห็นผล — เก็บลำดับเดิมไว้เผื่อต้อง rollback
      let prevPackages: Package[] = []
      setPackages(prev => {
        prevPackages = prev
        const byId = new Map(prev.map(p => [p.id, p]))
        return ids.map(id => byId.get(id)).filter((p): p is Package => p != null)
      })
      try {
        const token = await withToken()
        const reordered = await api.reorderPackages(token, ids)
        setPackages(reordered)
      } catch (err) {
        // บันทึกลำดับใหม่ไม่สำเร็จ — ย้อนกลับไปลำดับเดิมก่อนแทนที่จะค้างโชว์ลำดับผิดที่ backend ไม่รู้จัก
        setPackages(prevPackages)
        throw err
      }
    })

  /** role ที่แท้จริงมาจาก DB (backendUser) เสมอ — ไม่ใช้ claim ใน Auth0 token ตรงๆ เพราะ promote/demote ผ่านหน้า
   *  "สิทธิ์การเข้าถึง" แก้แค่ DB ไม่ได้แก้ token/Auth0 profile จึง claim เดิมค้างอยู่จนกว่าจะขอ token ใหม่
   *  ก่อน backendUser โหลดเสร็จ (ตอนแรกสุดหลัง login) ใช้ claim ไปพลางๆ ได้ เพราะหน้าจอที่พึ่ง role ยังไม่ render จนกว่า dataLoaded */
  const role = backendUser
    ? backendUser.role === 'OWNER'
      ? 'owner'
      : backendUser.role === 'SUPER_ADMIN'
        ? 'super_admin'
        : 'customer'
    : roleFromAuth0User(auth0User as Record<string, unknown> | undefined)
  /** เบอร์โทร/ชื่อ/นามสกุล เก็บที่ backend แล้ว (ผูกกับ Auth0 sub) — ขาดตัวไหนก็ถือว่ายังกรอกไม่ครบ ต้องเด้งไปกรอกใหม่ทุกครั้งที่ login จนกว่าจะครบ */
  const needsProfile =
    isAuthenticated &&
    role === 'customer' &&
    backendUser !== null &&
    (!backendUser.name || !backendUser.surname || !backendUser.phone)

  const user: UserProfile | null = backendUser
    ? {
        name: backendUser.name,
        surname: backendUser.surname,
        phone: backendUser.phone,
        lineId: backendUser.lineId,
        email: backendUser.email,
        avatar: backendUser.avatar,
      }
    : null

  const notifCount = unreadNotificationCount(bookings, notifSeenAt)

  /** navigate('login') คือปุ่ม "ออกจากระบบ" เดิมทุกจุดในแอป — ผูกเข้ากับ Auth0 logout จริงตรงนี้ที่เดียว */
  const navigate = (s: Screen) => {
    if (s === 'login') {
      forceLogout()
      return
    }
    // ออกจากขั้นตอนการจอง (กดแถบเมนูด้านบนไปหน้าอื่น) ไปหน้าที่ไม่ใช่ส่วนหนึ่งของ flow — ล้างข้อมูลจองที่เลือกไว้ กลับมาต้องเริ่มใหม่
    if (BOOKING_FLOW_SCREENS.includes(screen) && !BOOKING_FLOW_SCREENS.includes(s)) {
      setBooking(initialBooking)
    }
    // เข้าหน้าแจ้งเตือน — freeze ค่าเดิมไว้ให้หน้านั้นใช้ตัดสิน "ยังไม่อ่าน" รายรายการ แล้วค่อยอัปเดต/บันทึกค่าใหม่
    // ทันที ให้ตัวเลขที่กระดิ่งหายจากหน้าอื่นๆ ทันทีที่กดเข้ามาดู (เหมือนฝั่งเจ้าของร้านใน OwnerLayout.tsx)
    if (s === 'notifications') {
      setNotifPageSeenAt(notifSeenAt)
      const now = new Date().toISOString()
      setNotifSeenAt(now)
      try {
        localStorage.setItem(CUSTOMER_NOTIF_SEEN_KEY, now)
      } catch {
        // เพิกเฉยได้ถ้า localStorage ใช้งานไม่ได้ (เช่น private mode) — แค่ตัวเลขจะไม่คงอยู่ข้ามเซสชัน
      }
    }
    setScreen(s)
    // sync URL ให้ตรงกับหน้าที่กำลังไปเสมอ — ให้ back/forward และการแชร์ลิงก์ใช้ได้จริงทุกหน้า ไม่ใช่แค่หน้าแรก
    try {
      window.history.pushState(null, '', pathForScreen(s, role === 'owner' ? (backendUser?.shop?.slug ?? null) : selectedShopSlug))
    } catch {
      // เพิกเฉยได้ถ้า History API ใช้ไม่ได้
    }
  }

  /** คลิกการ์ดแจ้งเตือน (dropdown ฝั่งเจ้าของร้าน หรือหน้าแจ้งเตือนเต็มฝั่งลูกค้า) — เก็บ bookingId ไว้แล้วพาไปหน้า
   *  รายการที่ถูกต้องตาม role ให้หน้านั้นเปิดรายละเอียดใบจองนี้ให้เองทันที ไม่ต้องค้นหาเอง */
  const openNotificationBooking = (bookingId: string) => {
    setPendingNotifBookingId(bookingId)
    navigate(role === 'owner' ? 'owner-orders' : 'history')
  }

  /** ค่า "chrome"/config ระดับแอปที่หลายจุดดึงใช้ผ่าน useNav() แทนการรับเป็น props ทีละชั้น — ดู NavContext.tsx */
  const navContext: NavContextValue = useMemo(() => {
    const categories = orderedCategories(settings.categoryOrder, settings.categories)
    return {
      navigate,
      user,
      shopInfo: settings.shopInfo,
      notifCount,
      categories,
      categoryMap: categoryMapOf(categories),
      openNotificationBooking,
    }
  }, [navigate, user, settings.shopInfo, notifCount, settings.categoryOrder, settings.categories, openNotificationBooking])

  /** หลัง login สำเร็จ (และกรอกโปรไฟล์ครบถ้าเป็นลูกค้า) พาไปหน้าเริ่มต้นตาม role ทันที */
  const effectiveScreen: Screen =
    screen === 'login' && isAuthenticated && !needsProfile
      ? role === 'owner'
        ? 'owner-dashboard'
        : role === 'super_admin'
          ? 'super-admin'
          : 'home'
      : screen

  /** ตาข่ายสำรอง — เผื่อ role เปลี่ยนกลางเซสชัน (เช่นถูกถอดสิทธิ์ owner จากอีกแท็บ ระหว่างที่ค้างอยู่หน้า owner-*)
   *  แล้ว screen ที่ค้างอยู่ไม่ตรงกับ role ใหม่แล้ว ดีดกลับไปหน้า default ของ role ปัจจุบันแทนที่จะโชว์จอว่างเปล่า
   *  (ปกติไม่ควรเกิดจากโค้ดปกติอยู่แล้ว เพราะ navigate()/popstate เช็ค role ก่อนเซ็ต screen ทุกจุด แต่กันไว้ก่อน) */
  useEffect(() => {
    if (!dataLoaded || needsProfile) return
    const belongsToOwner = OWNER_SCREENS.includes(screen)
    const belongsToSuperAdmin = screen === 'super-admin'
    if ((belongsToOwner && role !== 'owner') || (belongsToSuperAdmin && role !== 'super_admin')) {
      navigate(defaultScreenFor(role))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, screen, dataLoaded, needsProfile])

  const handleSelectDateTime = (date: string, timeSlot: string) => {
    setBooking(b => ({ ...b, date, timeSlot }))
  }

  const handleSetTables = (n: number) => {
    setBooking(b => ({ ...b, tables: n }))
  }

  const handleSetLocation = (loc: EventLocation) => {
    setBooking(b => ({ ...b, location: loc }))
  }

  /** ตามลิงก์ย่อ Google Maps ฝั่ง backend (browser เรียกตรงไม่ได้ เพราะ Google ไม่เปิด CORS) */
  const handleResolveMapsLink = async (url: string) => {
    const token = await withToken()
    return api.resolveMapsLink(token, url)
  }

  const handleSelectPackage = (pkg: Package) => {
    setBooking(b => ({
      ...b,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.pricePerTable,
      menuLimit: pkg.menuLimit,
      // เปลี่ยนแพ็กเกจ = เริ่มเลือกเมนูใหม่ (ใส่ข้อที่รวมมาให้แล้วอัตโนมัติ)
      selectedMenus: b.packageId === pkg.id ? b.selectedMenus : includedItems(pkg),
    }))
  }

  const handleSetMenus = (menus: MenuItem[]) => {
    setBooking(b => ({ ...b, selectedMenus: menus }))
  }

  const handleUpdateSettings = (patch: Partial<AppSettings>) =>
    runAction(async () => {
      const token = await withToken()
      try {
        const updated = await api.updateSettings(token, patch)
        setSettings(updated)
      } catch (err) {
        // 409 = มีคนแก้ไขค่าตั้งค่าไปแล้วก่อนหน้านี้ (อีกแท็บ/อีกคน) — โหลดค่าล่าสุดจาก backend มาแทนที่ค่าในหน้าจอ
        // แทนที่จะทิ้งข้อความ error ดิบให้ผู้ใช้เห็น (มี version เดิมค้างอยู่ ไม่มีทาง save ซ้ำผ่านได้จนกว่าจะ refresh)
        const message = err instanceof Error ? err.message : ''
        if (/-> 409/.test(message)) {
          const fresh = await api.settings(token, activeShopId ?? undefined)
          setSettings(fresh)
          throw new Error('มีการแก้ไขค่าตั้งค่าจากที่อื่นไปแล้ว ระบบโหลดค่าล่าสุดมาให้แล้ว กรุณาตรวจสอบและบันทึกใหม่อีกครั้ง')
        }
        throw err
      }
    })

  const handleConfirm = () =>
    runAction(async () => {
      if (!booking.packageId) throw new Error('ยังไม่ได้เลือกแพ็กเกจ')
      if (!selectedShopId) throw new Error('ยังไม่ได้เลือกร้านที่จะจอง')
      // ราคา/ชื่อแพ็กเกจไม่ส่งจาก client แล้ว — backend คำนวณเองจาก packageId (กันแก้ request body ปลอมราคาจอง)
      // ยอดที่ตะกร้าโชว์ก่อนกดยืนยัน (Cart.tsx) เป็นแค่ตัวเลข preview ด้วยสูตรเดียวกัน ไม่ใช่ค่าที่ backend เชื่อ
      const token = await withToken()
      const created = await api.createBooking(token, {
        shopId: selectedShopId,
        date: booking.date || new Date().toISOString().split('T')[0],
        timeSlot: booking.timeSlot || 'ทั้งวัน',
        tables: booking.tables,
        guestCount: booking.guestCount,
        packageId: booking.packageId,
        location: booking.location ? formatFullAddress(booking.location) : 'ไม่ระบุ',
        locationDetail: booking.location ?? undefined,
        menus: booking.selectedMenus.map(m => m.name),
        lineId: user?.lineId || undefined,
      })
      setBookings(prev => [created, ...prev])
      // เพิ่มเข้าคิวรับงานทันที กันตัวเองเผลอเลือกวัน/ช่วงเวลาเดิมซ้ำถ้ากลับไปจองอีกใบ
      setAvailability(prev => [
        { date: created.date, timeSlot: created.timeSlot, tables: created.tables, status: created.status },
        ...prev,
      ])
      setBooking(initialBooking)
    })

  /** แก้ไขใบจอง — แยกปลายทางตาม patch: ลูกค้าแนบสลิป vs เจ้าของร้านเปลี่ยนสถานะ/บันทึกแผนกำลังคน */
  const handleUpdateBooking = (id: string, patch: Partial<Booking>) =>
    runAction(async () => {
      const token = await withToken()
      const updated =
        'paymentSlip' in patch && patch.paymentSlip
          ? await api.uploadPaymentSlip(token, id, await api.uploadImage(token, 'payment-slip', patch.paymentSlip))
          : await api.updateBookingAsOwner(token, id, {
              status: patch.status,
              staffAuto: patch.staffAuto,
              staffActual: patch.staffActual,
              staffNote: patch.staffNote,
            })
      setBookings(prev => prev.map(b => (b.id === id ? updated : b)))
      // เปลี่ยนสถานะ (เช่นยกเลิกงาน) กระทบคิวรับงานที่ลูกค้าเห็น — ดึงใหม่ให้ตรงกัน กันวันนั้นค้างว่า "เต็ม" อยู่
      // (owner-only action — activeShopId คือร้านตัวเองเสมอที่จุดนี้)
      if (patch.status !== undefined && activeShopId) setAvailability(await api.bookingsAvailability(token, activeShopId))
    })

  // กำลัง resolve ร้านจาก URL slug ที่แชร์มา (เช่น /pipat-catering) — เช็คก่อน isLoading เพราะไม่เกี่ยวกับ Auth0
  if (resolvingShopFromUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">กำลังโหลด...</div>
    )
  }

  // กำลังตรวจสอบ session ของ Auth0 (โหลดครั้งแรก / กลับจาก redirect)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">กำลังโหลด...</div>
    )
  }

  // ยังไม่ login — ต้องเลือกร้านก่อนเสมอ (multi-tenant) ถึงจะเห็นหน้า login ที่ตรงกับร้านนั้น
  if (!isAuthenticated) {
    if (!selectedShopId) return <ShopSelect onSelect={handleSelectShop} />
    return <Login shopId={selectedShopId} onChangeShop={handleChangeShop} />
  }

  // โหลดข้อมูลจาก backend ไม่สำเร็จ (เช่น server ไม่ทำงาน, token audience ไม่ตรง)
  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-red-500 text-sm">โหลดข้อมูลไม่สำเร็จ: {loadError}</p>
        <button
          onClick={() => setRetryKey(k => k + 1)}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
        >
          ลองใหม่
        </button>
      </div>
    )
  }

  // กำลังดึงข้อมูล bookings/packages/menus/settings จาก backend หลัง login
  if (!dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">กำลังโหลดข้อมูล...</div>
    )
  }

  // login ด้วย Google ครั้งแรก — Auth0 ไม่มีเบอร์โทร/Line ID ให้ ขอเพิ่มก่อนเข้าใช้งาน
  if (needsProfile) {
    return (
      <>
        {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
        <CompleteProfile
          name={backendUser?.name || ''}
          surname={backendUser?.surname || ''}
          phone={backendUser?.phone || ''}
          lineId={backendUser?.lineId || ''}
          onComplete={(profile) =>
            runAction(async () => {
              const token = await withToken()
              const updated = await api.updateProfile(token, profile)
              setBackendUser(updated)
              navigate('home')
            })
          }
        />
      </>
    )
  }

  // ลูกค้าที่มี session Auth0 ค้างอยู่แต่ยังไม่ได้เลือกร้านในเครื่องนี้ (เช่นล้าง localStorage ไปแล้ว) — ให้เลือกร้าน
  // ก่อน bootstrap effect ด้านบนถึงจะ fetch bookings/packages/menus/settings ของร้านนั้นต่อได้
  if (role === 'customer' && !selectedShopId) {
    return <ShopSelect onSelect={handleSelectShop} />
  }

  // Super admin — จัดการร้านทั้งระบบ ไม่ผูกกับร้านไหนเลย ไม่ใช้ OwnerLayout/หน้าจอฝั่งร้าน
  if (role === 'super_admin') {
    return (
      <NavProvider value={navContext}>
        {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
        <SuperAdmin
          shops={shopsAdmin}
          owners={ownersAdmin}
          onCreateShop={(input) =>
            runAction(async () => {
              const token = await withToken()
              await api.createShop(token, input)
              // createShop คืนแค่แถว Shop ดิบ (ไม่มี _count/totalRevenue เหมือน shopsList) — ถ้าเอามาต่อ state
              // ตรงๆ การ์ดร้านใหม่จะโชว์ 0 owner/0 การจอง ค้างจนกว่าจะ refresh หน้า ดึงชุดที่มี _count มาแทนเลย
              const [shops, owners] = await Promise.all([api.shopsList(token), api.listOwners(token)])
              setShopsAdmin(shops)
              setOwnersAdmin(owners)
            })
          }
          onSetShopStatus={(id, status) =>
            runAction(async () => {
              const token = await withToken()
              const updated = await api.setShopStatus(token, id, status)
              // setShopStatus คืนแค่แถว Shop ดิบเหมือน createShop/updateShop (ไม่มี _count/totalRevenue) —
              // merge แทนที่ทั้งก้อน กัน owner/จำนวนจองที่โชว์อยู่หายไปตอนกดระงับ/เปิดใช้งาน
              setShopsAdmin(prev => prev.map(s => (s.id === id ? { ...s, ...updated } : s)))
            })
          }
          onAddOwner={(id, email) =>
            runAction(async () => {
              const token = await withToken()
              await api.addShopOwner(token, id, email)
              const [shops, owners] = await Promise.all([api.shopsList(token), api.listOwners(token)])
              setShopsAdmin(shops)
              setOwnersAdmin(owners)
            })
          }
          onRemoveOwner={(shopId, userId) =>
            runAction(async () => {
              const token = await withToken()
              await api.removeShopOwner(token, shopId, userId)
              const [shops, owners] = await Promise.all([api.shopsList(token), api.listOwners(token)])
              setShopsAdmin(shops)
              setOwnersAdmin(owners)
            })
          }
          onUpdateShop={(id, input) =>
            runAction(async () => {
              const token = await withToken()
              const updated = await api.updateShop(token, id, input)
              setShopsAdmin(prev => prev.map(s => (s.id === id ? { ...s, ...updated } : s)))
            })
          }
          onDeleteShop={(id, confirmName) =>
            runAction(async () => {
              const token = await withToken()
              await api.deleteShop(token, id, confirmName)
              setShopsAdmin(prev => prev.filter(s => s.id !== id))
              setOwnersAdmin(await api.listOwners(token))
            })
          }
          onSearchUser={(email) => withToken().then(token => api.searchUsers(token, email))}
          onSetSuperAdmin={(userId, isSuperAdmin) =>
            runAction(async () => {
              const token = await withToken()
              await api.setUserRole(token, userId, isSuperAdmin ? 'SUPER_ADMIN' : 'CUSTOMER')
            })
          }
          onFetchAuditPage={(page, pageSize) => withToken().then(token => api.auditLog(token, page, pageSize))}
          auditRefreshSignal={auditRefreshSignal}
        />
      </NavProvider>
    )
  }

  // Owner screens
  if (role === 'owner' && OWNER_SCREENS.includes(effectiveScreen)) {
    return (
      <NavProvider value={navContext}>
        <OwnerLayout currentScreen={effectiveScreen} bookings={bookings}>
          {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
          {effectiveScreen === 'owner-dashboard' && (
            <Dashboard bookings={bookings} menus={menus} settings={settings} />
          )}
          {effectiveScreen === 'owner-orders' && (
            <Orders
              bookings={bookings}
              menus={menus}
              settings={settings}
              onUpdateBooking={handleUpdateBooking}
              onFetchPaymentSlip={handleFetchPaymentSlip}
              openBookingId={pendingNotifBookingId}
              onOpenBookingIdHandled={() => setPendingNotifBookingId(null)}
            />
          )}
          {effectiveScreen === 'owner-calendar' && (
            <CalendarView
              bookings={bookings}
              onUpdateBooking={handleUpdateBooking}
              onFetchPaymentSlip={handleFetchPaymentSlip}
            />
          )}
          {effectiveScreen === 'owner-packages' && (
            <Packages
              packages={packages}
              menus={menus}
              settings={settings}
              onCreatePackage={handleCreatePackage}
              onUpdatePackage={handleUpdatePackage}
              onDeletePackage={handleDeletePackage}
              onReorderPackages={handleReorderPackages}
            />
          )}
          {effectiveScreen === 'owner-menus' && (
            <Menus
              menus={menus}
              packages={packages}
              settings={settings}
              onSaveMenu={handleSaveMenu}
              onDeleteMenu={handleDeleteMenu}
              onUploadImage={handleUploadImage}
            />
          )}
          {effectiveScreen === 'owner-documents' && (
            <Documents bookings={bookings} menus={menus} settings={settings} />
          )}
          {effectiveScreen === 'owner-reports' && (
            <Reports bookings={bookings} menus={menus} settings={settings} />
          )}
          {effectiveScreen === 'owner-settings' && (
            <Settings settings={settings} onUpdateSettings={handleUpdateSettings} onUploadImage={handleUploadImage} />
          )}
          {effectiveScreen === 'owner-page-content' && (
            <PageContent settings={settings} onUpdateSettings={handleUpdateSettings} onUploadImage={handleUploadImage} />
          )}
          {effectiveScreen === 'owner-users' && (
            <UserRoles
              onSearchUser={(email) => withToken().then(token => api.searchUsers(token, email))}
              onSetRole={(userId, role) =>
                withToken()
                  .then(token => api.setUserRole(token, userId, role))
                  .then(() => {})
              }
              onListOwners={() => withToken().then(token => api.listOwners(token))}
              currentAuth0Sub={auth0User?.sub}
              refreshSignal={usersRefreshSignal}
            />
          )}
          {effectiveScreen === 'owner-audit-log' && (
            <AuditLog
              onFetchPage={(page, pageSize) => withToken().then(token => api.auditLog(token, page, pageSize))}
              refreshSignal={auditRefreshSignal}
            />
          )}
        </OwnerLayout>
      </NavProvider>
    )
  }

  // Customer screens
  return (
    <NavProvider value={navContext}>
      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
      {/* เจ้าของร้านกำลังดูมุมมองลูกค้าอยู่ (กดปุ่ม "มุมมองลูกค้า" ใน OwnerLayout) — มีทางกลับเสมอ ไม่ว่าจะอยู่หน้าไหน */}
      {role === 'owner' && (
        <button
          onClick={() => navigate('owner-dashboard')}
          className="fixed top-3 right-4 sm:right-6 lg:right-8 z-[60] flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-xl shadow-lg text-sm font-medium transition-colors"
        >
          <LayoutDashboard size={16} />
          กลับสู่แดชบอร์ด
        </button>
      )}
      {effectiveScreen === 'home' && <Home homeContent={settings.homeContent} />}
      {effectiveScreen === 'booking-calendar' && (
        <BookingCalendar
          bookings={availability}
          onSelectDateTime={handleSelectDateTime}
          slotHours={settings.timeSlotHours}
          closedDates={settings.closedDates}
        />
      )}
      {effectiveScreen === 'select-table' && (
        <SelectTable
          tables={booking.tables}
          onSetTables={handleSetTables}
          date={booking.date}
          timeSlot={booking.timeSlot}
          deliveryFee={settings.deliveryFee}
          freeDeliveryMinTables={settings.freeDeliveryMinTables}
          homeProvince={settings.homeProvince}
        />
      )}
      {effectiveScreen === 'select-location' && (
        <SelectLocation
          tables={booking.tables}
          location={booking.location}
          onSetLocation={handleSetLocation}
          onResolveMapsLink={handleResolveMapsLink}
          deliveryFee={settings.deliveryFee}
          freeDeliveryMinTables={settings.freeDeliveryMinTables}
          shopLocation={settings.shopLocation}
          fuelCostPerKm={settings.fuelCostPerKm}
          metroProvinces={settings.metroProvinces}
          homeProvince={settings.homeProvince}
        />
      )}
      {effectiveScreen === 'select-package' && (
        <SelectPackage
          packages={packages}
          tables={booking.tables}
          selectedPackageId={booking.packageId}
          onSelectPackage={handleSelectPackage}
        />
      )}
      {effectiveScreen === 'select-menu' && (
        <SelectMenu
          packages={packages}
          packageId={booking.packageId}
          selectedMenus={booking.selectedMenus}
          onSetMenus={handleSetMenus}
        />
      )}
      {effectiveScreen === 'cart' && (
        <Cart
          role={role}
          packages={packages}
          booking={booking}
          onConfirm={handleConfirm}
          deliveryFee={settings.deliveryFee}
          freeDeliveryMinTables={settings.freeDeliveryMinTables}
          fuelCostPerKm={settings.fuelCostPerKm}
          homeProvince={settings.homeProvince}
        />
      )}
      {effectiveScreen === 'history' && (
        <BookingHistory
          bookings={bookings}
          onUpdateBooking={handleUpdateBooking}
          settings={settings}
          onFetchPaymentSlip={handleFetchPaymentSlip}
          openBookingId={pendingNotifBookingId}
          onOpenBookingIdHandled={() => setPendingNotifBookingId(null)}
        />
      )}
      {effectiveScreen === 'notifications' && <Notifications bookings={bookings} notifSeenAt={notifPageSeenAt} />}
    </NavProvider>
  )
}
