import { useEffect, useMemo, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { LayoutDashboard } from 'lucide-react'
import type { AppSettings, BookingData, Screen, UserProfile, Booking, EventLocation, MenuItem, Package, QueueBooking } from './types'
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
import { api, type BackendUser, type CreatePackageInput, type UpdatePackageInput, type UploadImageKind } from './api'
import { usePolling } from './usePolling'
import { useBookingsStream } from './useBookingsStream'
import { isSessionExpiredError } from './sessionExpired'
import ErrorBanner from './components/ErrorBanner'
import Login from './screens/Login'
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

const OWNER_SCREENS: Screen[] = [
  'owner-dashboard', 'owner-orders', 'owner-calendar', 'owner-packages', 'owner-menus', 'owner-documents',
  'owner-reports', 'owner-settings', 'owner-page-content', 'owner-users', 'owner-audit-log',
]

/** 6 ขั้นตอนการจอง — ออกจากช่วงนี้ไปหน้าอื่นผ่านแถบเมนูด้านบน (หน้าแรก/ประวัติการจอง) แล้วกลับมาต้องเริ่มเลือกใหม่ ไม่ resume ของเดิม */
const BOOKING_FLOW_SCREENS: Screen[] = [
  'booking-calendar', 'select-table', 'select-location', 'select-package', 'select-menu', 'cart',
]

const initialSettings: AppSettings = {
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

const SETTINGS_POLL_MS = 20_000
/** ทางหลักที่ทำให้รายการจองเห็นการเปลี่ยนแปลงแบบ realtime คือ useBookingsStream (SSE) ด้านล่าง — ตัวนี้เป็นแค่
 *  fallback เผื่อ SSE เชื่อมต่อไม่ได้ (เช่น proxy/network บาง setup ไม่รองรับ event stream) จึง poll ห่างๆ พอ */
const BOOKINGS_POLL_MS = 60_000
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

  /** โหลดข้อมูลทั้งหมดจาก backend ทันทีที่ login สำเร็จ — sync user + ดึง bookings/packages/menus/settings พร้อมกัน */
  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false

    const load = async () => {
      setLoadError(null)
      try {
        const token = await getAccessTokenSilently()
        // access token ไม่มี name/email/picture ให้ (มีแค่ role claim) — ส่งจาก ID token ฝั่งนี้แทน
        const [me, bks, avail, pkgs, mns, sttgs] = await Promise.all([
          api.syncProfile(token, {
            name: auth0User?.given_name || auth0User?.name?.split(' ')[0] || 'ผู้ใช้',
            surname: auth0User?.family_name || auth0User?.name?.split(' ').slice(1).join(' ') || '',
            email: auth0User?.email ?? '',
            avatar: auth0User?.picture ?? '',
          }),
          api.bookings(token),
          api.bookingsAvailability(token),
          api.packages(token),
          api.menus(token),
          api.settings(token),
        ])
        if (cancelled) return
        setBackendUser(me)
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
  }, [isAuthenticated, getAccessTokenSilently, auth0User, retryKey])

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

  // poll ค่าตั้งค่าร้านทุก 20 วิหลัง login (หยุดพักตอนสลับแท็บ) — เจ้าของร้านแก้ชื่อร้าน/ค่าอื่นๆ
  // จากเครื่อง/แท็บอื่น หน้าที่เปิดค้างไว้จะเห็นการเปลี่ยนแปลงโดยไม่ต้องกด refresh เอง
  usePolling(() => {
    if (!isAuthenticated) return
    withToken()
      .then(token => api.settings(token))
      .then(setSettings)
      .catch(() => {})
  }, SETTINGS_POLL_MS)

  const refetchBookings = () => {
    withToken()
      .then(token => api.bookings(token))
      .then(setBookings)
      .catch(() => {})
  }

  // SSE — backend ยิงสัญญาณทันทีที่มีการจอง/แก้ไขใบจอง (ดู backend/src/realtime) ให้ owner เห็นรายการจองใหม่
  // แทบจะทันทีโดยไม่ต้อง refresh เอง แทนที่จะรอ poll รอบถัดไป
  useBookingsStream(isAuthenticated && dataLoaded, withToken, refetchBookings)

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
      // จัดเรียงในจอทันทีตอนลากวาง ไม่ต้องรอ backend ตอบก่อนถึงจะเห็นผล
      setPackages(prev => {
        const byId = new Map(prev.map(p => [p.id, p]))
        return ids.map(id => byId.get(id)).filter((p): p is Package => p != null)
      })
      const token = await withToken()
      const reordered = await api.reorderPackages(token, ids)
      setPackages(reordered)
    })

  /** role ที่แท้จริงมาจาก DB (backendUser) เสมอ — ไม่ใช้ claim ใน Auth0 token ตรงๆ เพราะ promote/demote ผ่านหน้า
   *  "สิทธิ์การเข้าถึง" แก้แค่ DB ไม่ได้แก้ token/Auth0 profile จึง claim เดิมค้างอยู่จนกว่าจะขอ token ใหม่
   *  ก่อน backendUser โหลดเสร็จ (ตอนแรกสุดหลัง login) ใช้ claim ไปพลางๆ ได้ เพราะหน้าจอที่พึ่ง role ยังไม่ render จนกว่า dataLoaded */
  const role = backendUser ? (backendUser.role === 'OWNER' ? 'owner' : 'customer') : roleFromAuth0User(auth0User as Record<string, unknown> | undefined)
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
    }
  }, [navigate, user, settings.shopInfo, notifCount, settings.categoryOrder, settings.categories])

  /** หลัง login สำเร็จ (และกรอกโปรไฟล์ครบถ้าเป็นลูกค้า) พาไปหน้าเริ่มต้นตาม role ทันที */
  const effectiveScreen: Screen =
    screen === 'login' && isAuthenticated && !needsProfile
      ? role === 'owner'
        ? 'owner-dashboard'
        : 'home'
      : screen

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
      const updated = await api.updateSettings(token, patch)
      setSettings(updated)
    })

  const handleConfirm = () =>
    runAction(async () => {
      if (!booking.packageId) throw new Error('ยังไม่ได้เลือกแพ็กเกจ')
      // ราคา/ชื่อแพ็กเกจไม่ส่งจาก client แล้ว — backend คำนวณเองจาก packageId (กันแก้ request body ปลอมราคาจอง)
      // ยอดที่ตะกร้าโชว์ก่อนกดยืนยัน (Cart.tsx) เป็นแค่ตัวเลข preview ด้วยสูตรเดียวกัน ไม่ใช่ค่าที่ backend เชื่อ
      const token = await withToken()
      const created = await api.createBooking(token, {
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
      if (patch.status !== undefined) setAvailability(await api.bookingsAvailability(token))
    })

  // กำลังตรวจสอบ session ของ Auth0 (โหลดครั้งแรก / กลับจาก redirect)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">กำลังโหลด...</div>
    )
  }

  // ยังไม่ login
  if (!isAuthenticated) {
    return <Login />
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
              setScreen('home')
            })
          }
        />
      </>
    )
  }

  // Owner screens
  if (OWNER_SCREENS.includes(effectiveScreen)) {
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
            />
          )}
          {effectiveScreen === 'owner-audit-log' && (
            <AuditLog onFetchPage={(page, pageSize) => withToken().then(token => api.auditLog(token, page, pageSize))} />
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
        />
      )}
      {effectiveScreen === 'notifications' && <Notifications bookings={bookings} notifSeenAt={notifPageSeenAt} />}
    </NavProvider>
  )
}
