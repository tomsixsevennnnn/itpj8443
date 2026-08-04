import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { LayoutDashboard } from 'lucide-react'
import type { AppSettings, BookingData, Screen, UserProfile, Booking, EventLocation, MenuItem, Package } from './types'
import { includedItems } from './data'
import { DEFAULT_DEPOSIT_RATE, DEFAULT_SHOP_INFO } from './documents'
import { DEFAULT_DELIVERY_FEE, DEFAULT_FREE_DELIVERY_MIN_TABLES, deliveryFeeFor, formatFullAddress } from './geo'
import {
  DEFAULT_WAGE_ASSISTANT,
  DEFAULT_WAGE_CHEF,
  DEFAULT_WAGE_DISHWASHER,
  DEFAULT_WAGE_SERVER_PER_TABLE,
} from './costing'
import { roleFromAuth0User } from './auth'
import { api, type BackendUser, type CreatePackageInput, type UpdatePackageInput } from './api'
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
import OwnerLayout from './components/OwnerLayout'
import Dashboard from './screens/owner/Dashboard'
import Orders from './screens/owner/Orders'
import CalendarView from './screens/owner/CalendarView'
import Packages from './screens/owner/Packages'
import Menus from './screens/owner/Menus'
import Documents from './screens/owner/Documents'
import Customers from './screens/owner/Customers'
import Settings from './screens/owner/Settings'

const OWNER_SCREENS: Screen[] = [
  'owner-dashboard', 'owner-orders', 'owner-calendar', 'owner-packages', 'owner-menus', 'owner-documents',
  'owner-customers', 'owner-settings',
]

const initialSettings: AppSettings = {
  shopInfo: DEFAULT_SHOP_INFO,
  depositRate: DEFAULT_DEPOSIT_RATE,
  deliveryFee: DEFAULT_DELIVERY_FEE,
  freeDeliveryMinTables: DEFAULT_FREE_DELIVERY_MIN_TABLES,
  wageChef: DEFAULT_WAGE_CHEF,
  wageAssistant: DEFAULT_WAGE_ASSISTANT,
  wageServerPerTable: DEFAULT_WAGE_SERVER_PER_TABLE,
  wageDishwasher: DEFAULT_WAGE_DISHWASHER,
}

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

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format'

export default function App() {
  const { isAuthenticated, isLoading, user: auth0User, logout, getAccessTokenSilently } = useAuth0()
  const [screen, setScreen] = useState<Screen>('login')
  const [booking, setBooking] = useState<BookingData>(initialBooking)
  // รายการจองทั้งหมด — ใช้ร่วมกันทั้งปฏิทินลูกค้า ปฏิทินร้าน ประวัติ และเอกสาร (มาจาก backend ทั้งหมด)
  const [bookings, setBookings] = useState<Booking[]>([])
  // แพ็กเกจและคลังเมนูอยู่ที่นี่ เพื่อให้เจ้าของร้านแก้แล้วฝั่งลูกค้าเห็นผลทันที
  const [packages, setPackages] = useState<Package[]>([])
  const [menus, setMenus] = useState<MenuItem[]>([])
  // ค่าตั้งค่าร้าน — แก้ได้จากหน้า "ตั้งค่า" ฝั่งเจ้าของร้าน มีผลกับค่าขนส่ง มัดจำ และข้อมูลบนเอกสารทันที
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
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
        const [me, bks, pkgs, mns, sttgs] = await Promise.all([
          api.syncProfile(token, {
            name: auth0User?.given_name || auth0User?.name?.split(' ')[0] || 'ผู้ใช้',
            surname: auth0User?.family_name || auth0User?.name?.split(' ').slice(1).join(' ') || '',
            email: auth0User?.email ?? '',
            avatar: auth0User?.picture ?? '',
          }),
          api.bookings(token),
          api.packages(token),
          api.menus(token),
          api.settings(token),
        ])
        if (cancelled) return
        setBackendUser(me)
        setBookings(bks)
        setPackages(pkgs)
        setMenus(mns)
        setSettings(sttgs)
        setDataLoaded(true)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, getAccessTokenSilently, auth0User, retryKey])

  const withToken = () => getAccessTokenSilently()

  /** ห่อ handler ที่ยิง API ทุกตัว — ถ้า error ให้เด้ง banner แจ้งผู้ใช้แทนที่จะเงียบ/พังไม่รู้สาเหตุ */
  const runAction = async (fn: () => Promise<void>) => {
    try {
      setActionError(null)
      await fn()
    } catch (err) {
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
        extraPrice: item.extraPrice,
        costPrice: item.costPrice,
        sellPrice: item.sellPrice,
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

  /** เข้าเว็บด้วย role จาก Auth0 (customer = Google, owner = username/password) ดู src/auth.ts */
  const role = roleFromAuth0User(auth0User as Record<string, unknown> | undefined)
  /** เบอร์โทร/Line ID เก็บที่ backend แล้ว (ผูกกับ Auth0 sub) — ยังไม่กรอก = phone ว่าง */
  const needsProfile = isAuthenticated && role === 'customer' && backendUser !== null && !backendUser.phone

  const user: UserProfile | null = backendUser
    ? {
        name: backendUser.name,
        surname: backendUser.surname,
        phone: backendUser.phone,
        lineId: backendUser.lineId,
        email: backendUser.email,
        avatar: backendUser.avatar || DEFAULT_AVATAR,
      }
    : null

  /** navigate('login') คือปุ่ม "ออกจากระบบ" เดิมทุกจุดในแอป — ผูกเข้ากับ Auth0 logout จริงตรงนี้ที่เดียว */
  const navigate = (s: Screen) => {
    if (s === 'login') {
      logout({ logoutParams: { returnTo: window.location.origin } })
      return
    }
    setScreen(s)
  }

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

  const handleSetGuestCount = (n: number) => {
    setBooking(b => ({ ...b, guestCount: n }))
  }

  const handleSetLocation = (loc: EventLocation) => {
    setBooking(b => ({ ...b, location: loc }))
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
      // คิดยอดแบบเดียวกับหน้าตะกร้า เพื่อให้ใบเสนอราคา/ใบจองตรงกัน
      const subtotal = booking.packagePrice * booking.tables
      const deliveryFee = deliveryFeeFor(booking.tables, booking.location, settings.deliveryFee, settings.freeDeliveryMinTables)

      const token = await withToken()
      const created = await api.createBooking(token, {
        date: booking.date || new Date().toISOString().split('T')[0],
        timeSlot: booking.timeSlot || 'ทั้งวัน',
        tables: booking.tables,
        guestCount: booking.guestCount,
        packageName: booking.packageName || 'Standard',
        totalPrice: subtotal + deliveryFee,
        pricePerTable: booking.packagePrice,
        deliveryFee,
        location: booking.location ? formatFullAddress(booking.location) : 'ไม่ระบุ',
        locationDetail: booking.location ?? undefined,
        menus: booking.selectedMenus.map(m => m.name),
        lineId: user?.lineId || undefined,
      })
      setBookings(prev => [created, ...prev])
      setBooking(initialBooking)
    })

  /** แก้ไขใบจอง — แยกปลายทางตาม patch: ลูกค้าแนบสลิป vs เจ้าของร้านเปลี่ยนสถานะ/บันทึกแผนกำลังคน */
  const handleUpdateBooking = (id: string, patch: Partial<Booking>) =>
    runAction(async () => {
      const token = await withToken()
      const updated =
        'paymentSlip' in patch && patch.paymentSlip
          ? await api.uploadPaymentSlip(token, id, patch.paymentSlip)
          : await api.updateBookingAsOwner(token, id, {
              status: patch.status,
              staffAuto: patch.staffAuto,
              staffActual: patch.staffActual,
              staffNote: patch.staffNote,
            })
      setBookings(prev => prev.map(b => (b.id === id ? updated : b)))
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
      <OwnerLayout navigate={navigate} currentScreen={effectiveScreen} user={user}>
        {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
        {effectiveScreen === 'owner-dashboard' && (
          <Dashboard bookings={bookings} menus={menus} settings={settings} />
        )}
        {effectiveScreen === 'owner-orders' && (
          <Orders bookings={bookings} menus={menus} settings={settings} onUpdateBooking={handleUpdateBooking} />
        )}
        {effectiveScreen === 'owner-calendar' && (
          <CalendarView bookings={bookings} onUpdateBooking={handleUpdateBooking} />
        )}
        {effectiveScreen === 'owner-packages' && (
          <Packages
            packages={packages}
            menus={menus}
            onCreatePackage={handleCreatePackage}
            onUpdatePackage={handleUpdatePackage}
            onDeletePackage={handleDeletePackage}
          />
        )}
        {effectiveScreen === 'owner-menus' && (
          <Menus
            menus={menus}
            packages={packages}
            onSaveMenu={handleSaveMenu}
            onDeleteMenu={handleDeleteMenu}
          />
        )}
        {effectiveScreen === 'owner-documents' && (
          <Documents bookings={bookings} menus={menus} settings={settings} />
        )}
        {effectiveScreen === 'owner-customers' && <Customers bookings={bookings} />}
        {effectiveScreen === 'owner-settings' && (
          <Settings settings={settings} onUpdateSettings={handleUpdateSettings} />
        )}
      </OwnerLayout>
    )
  }

  // Customer screens
  return (
    <>
      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
      {/* เจ้าของร้านกำลังดูมุมมองลูกค้าอยู่ (กดปุ่ม "มุมมองลูกค้า" ใน OwnerLayout) — มีทางกลับเสมอ ไม่ว่าจะอยู่หน้าไหน */}
      {role === 'owner' && (
        <button
          onClick={() => navigate('owner-dashboard')}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-medium transition-colors"
        >
          <LayoutDashboard size={16} />
          กลับสู่แดชบอร์ด
        </button>
      )}
      {effectiveScreen === 'home' && (
        <Home navigate={navigate} user={user} />
      )}
      {effectiveScreen === 'booking-calendar' && (
        <BookingCalendar
          navigate={navigate}
          user={user}
          bookings={bookings}
          onSelectDateTime={handleSelectDateTime}
        />
      )}
      {effectiveScreen === 'select-table' && (
        <SelectTable
          navigate={navigate}
          user={user}
          tables={booking.tables}
          guestCount={booking.guestCount}
          onSetTables={handleSetTables}
          onSetGuestCount={handleSetGuestCount}
          date={booking.date}
          timeSlot={booking.timeSlot}
          deliveryFee={settings.deliveryFee}
          freeDeliveryMinTables={settings.freeDeliveryMinTables}
        />
      )}
      {effectiveScreen === 'select-location' && (
        <SelectLocation
          navigate={navigate}
          user={user}
          tables={booking.tables}
          location={booking.location}
          onSetLocation={handleSetLocation}
          deliveryFee={settings.deliveryFee}
          freeDeliveryMinTables={settings.freeDeliveryMinTables}
        />
      )}
      {effectiveScreen === 'select-package' && (
        <SelectPackage
          navigate={navigate}
          user={user}
          packages={packages}
          tables={booking.tables}
          selectedPackageId={booking.packageId}
          onSelectPackage={handleSelectPackage}
        />
      )}
      {effectiveScreen === 'select-menu' && (
        <SelectMenu
          navigate={navigate}
          user={user}
          packages={packages}
          packageId={booking.packageId}
          selectedMenus={booking.selectedMenus}
          onSetMenus={handleSetMenus}
        />
      )}
      {effectiveScreen === 'cart' && (
        <Cart
          navigate={navigate}
          user={user}
          packages={packages}
          booking={booking}
          onConfirm={handleConfirm}
          deliveryFee={settings.deliveryFee}
          freeDeliveryMinTables={settings.freeDeliveryMinTables}
        />
      )}
      {effectiveScreen === 'history' && (
        <BookingHistory
          navigate={navigate}
          user={user}
          bookings={bookings}
          onUpdateBooking={handleUpdateBooking}
          settings={settings}
        />
      )}
      {effectiveScreen === 'notifications' && (
        <Notifications navigate={navigate} user={user} />
      )}
    </>
  )
}
