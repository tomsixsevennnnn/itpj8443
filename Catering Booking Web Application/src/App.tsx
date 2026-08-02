import { useState } from 'react'
import type { BookingData, Screen, UserProfile, Booking, EventLocation, MenuItem, Package } from './types'
import { MENU_ITEMS, MOCK_BOOKINGS, PACKAGES, includedItems } from './data'
import { deliveryFeeFor, formatFullAddress } from './geo'
import Login from './screens/Login'
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

const OWNER_SCREENS: Screen[] = [
  'owner-dashboard', 'owner-orders', 'owner-calendar', 'owner-packages', 'owner-menus', 'owner-documents',
]

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
  const [screen, setScreen] = useState<Screen>('login')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [booking, setBooking] = useState<BookingData>(initialBooking)
  // รายการจองทั้งหมด — ใช้ร่วมกันทั้งปฏิทินลูกค้า ปฏิทินร้าน ประวัติ และเอกสาร
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS)
  // แพ็กเกจและคลังเมนูอยู่ที่นี่ เพื่อให้เจ้าของร้านแก้แล้วฝั่งลูกค้าเห็นผลทันที
  const [packages, setPackages] = useState<Package[]>(PACKAGES)
  const [menus, setMenus] = useState<MenuItem[]>(MENU_ITEMS)

  /** เพิ่มหรือแก้ไขเมนู — ถ้าแก้ของเดิม ให้ซิงก์เข้าไปในแพ็กเกจที่ใช้เมนูนี้อยู่ด้วย */
  const handleSaveMenu = (item: MenuItem) => {
    setMenus(prev =>
      prev.some(m => m.id === item.id) ? prev.map(m => (m.id === item.id ? item : m)) : [...prev, item]
    )
    setPackages(prev =>
      prev.map(p => ({
        ...p,
        courses: p.courses.map(c => ({
          ...c,
          items: c.items.map(i => (i.id === item.id ? item : i)),
        })),
      }))
    )
  }

  /** ลบเมนูออกจากคลัง พร้อมถอดออกจากทุกแพ็กเกจที่ใช้อยู่ */
  const handleDeleteMenu = (id: string) => {
    setMenus(prev => prev.filter(m => m.id !== id))
    setPackages(prev =>
      prev.map(p => ({
        ...p,
        courses: p.courses.map(c => ({ ...c, items: c.items.filter(i => i.id !== id) })),
      }))
    )
  }

  const navigate = (s: Screen) => setScreen(s)

  const handleLogin = (u: UserProfile) => {
    setUser(u)
  }

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

  const handleConfirm = () => {
    // คิดยอดแบบเดียวกับหน้าตะกร้า เพื่อให้ใบเสนอราคา/ใบจองตรงกัน
    const subtotal = booking.packagePrice * booking.tables
    const deliveryFee = deliveryFeeFor(booking.tables, booking.location)

    const newBooking: Booking = {
      id: `BK-2025-${String(Math.floor(Math.random() * 900 + 100))}`,
      customerName: user ? `${user.name} ${user.surname}` : 'ลูกค้า',
      date: booking.date || new Date().toISOString().split('T')[0],
      timeSlot: booking.timeSlot || 'ทั้งวัน',
      tables: booking.tables,
      guestCount: booking.guestCount,
      packageName: booking.packageName || 'Standard',
      totalPrice: subtotal + deliveryFee,
      pricePerTable: booking.packagePrice,
      deliveryFee,
      status: 'pending',
      location: booking.location ? formatFullAddress(booking.location) : 'ไม่ระบุ',
      locationDetail: booking.location ?? undefined,
      menus: booking.selectedMenus.map(m => m.name),
      phone: user?.phone || '—',
    }
    setBookings(prev => [newBooking, ...prev])
    setBooking(initialBooking)
  }

  /** แก้ไขใบจอง (เปลี่ยนสถานะ / บันทึกแผนกำลังคน) */
  const handleUpdateBooking = (id: string, patch: Partial<Booking>) => {
    setBookings(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)))
  }

  // Owner screens
  if (OWNER_SCREENS.includes(screen)) {
    return (
      <OwnerLayout navigate={navigate} currentScreen={screen}>
        {screen === 'owner-dashboard' && <Dashboard bookings={bookings} />}
        {screen === 'owner-orders' && (
          <Orders bookings={bookings} onUpdateBooking={handleUpdateBooking} />
        )}
        {screen === 'owner-calendar' && (
          <CalendarView bookings={bookings} onUpdateBooking={handleUpdateBooking} />
        )}
        {screen === 'owner-packages' && (
          <Packages packages={packages} menus={menus} onUpdate={setPackages} />
        )}
        {screen === 'owner-menus' && (
          <Menus
            menus={menus}
            packages={packages}
            onSaveMenu={handleSaveMenu}
            onDeleteMenu={handleDeleteMenu}
          />
        )}
        {screen === 'owner-documents' && <Documents bookings={bookings} />}
      </OwnerLayout>
    )
  }

  // Customer screens
  return (
    <>
      {screen === 'login' && (
        <Login navigate={navigate} onLogin={handleLogin} />
      )}
      {screen === 'home' && (
        <Home navigate={navigate} user={user} />
      )}
      {screen === 'booking-calendar' && (
        <BookingCalendar
          navigate={navigate}
          user={user}
          bookings={bookings}
          onSelectDateTime={handleSelectDateTime}
        />
      )}
      {screen === 'select-table' && (
        <SelectTable
          navigate={navigate}
          user={user}
          tables={booking.tables}
          guestCount={booking.guestCount}
          onSetTables={handleSetTables}
          onSetGuestCount={handleSetGuestCount}
          date={booking.date}
          timeSlot={booking.timeSlot}
        />
      )}
      {screen === 'select-location' && (
        <SelectLocation
          navigate={navigate}
          user={user}
          tables={booking.tables}
          location={booking.location}
          onSetLocation={handleSetLocation}
        />
      )}
      {screen === 'select-package' && (
        <SelectPackage
          navigate={navigate}
          user={user}
          packages={packages}
          tables={booking.tables}
          selectedPackageId={booking.packageId}
          onSelectPackage={handleSelectPackage}
        />
      )}
      {screen === 'select-menu' && (
        <SelectMenu
          navigate={navigate}
          user={user}
          packages={packages}
          packageId={booking.packageId}
          selectedMenus={booking.selectedMenus}
          onSetMenus={handleSetMenus}
        />
      )}
      {screen === 'cart' && (
        <Cart navigate={navigate} user={user} packages={packages} booking={booking} onConfirm={handleConfirm} />
      )}
      {screen === 'history' && (
        <BookingHistory navigate={navigate} user={user} bookings={bookings} onUpdateBooking={handleUpdateBooking} />
      )}
      {screen === 'notifications' && (
        <Notifications navigate={navigate} user={user} />
      )}
    </>
  )
}
