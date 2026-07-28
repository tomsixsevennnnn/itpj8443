import { useState } from 'react'
import type { BookingData, Screen, UserProfile, Booking, MenuItem, Package } from './types'
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
  menuLimit: 7,
  selectedMenus: [],
  drinkOption: null,
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [booking, setBooking] = useState<BookingData>(initialBooking)
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)

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

  const handleSetLocation = (loc: { lat: number; lng: number; address: string }) => {
    setBooking(b => ({ ...b, location: loc }))
  }

  const handleSelectPackage = (pkg: Package) => {
    setBooking(b => ({
      ...b,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.pricePerTable,
      menuLimit: pkg.menuLimit,
      selectedMenus: b.selectedMenus.slice(0, pkg.menuLimit),
    }))
  }

  const handleSetMenus = (menus: MenuItem[]) => {
    setBooking(b => ({ ...b, selectedMenus: menus }))
  }

  const handleSetDrinkOption = (option: 'provided' | 'self') => {
    setBooking(b => ({ ...b, drinkOption: option }))
  }

  const handleConfirm = () => {
    const newBooking: Booking = {
      id: `BK-2025-${String(Math.floor(Math.random() * 900 + 100))}`,
      customerName: user ? `${user.name} ${user.surname}` : 'ลูกค้า',
      date: booking.date || new Date().toISOString().split('T')[0],
      timeSlot: booking.timeSlot || 'ทั้งวัน',
      tables: booking.tables,
      guestCount: booking.guestCount,
      packageName: booking.packageName || 'Standard',
      totalPrice: booking.packagePrice * booking.tables * 1.07,
      status: 'pending',
      location: booking.location?.address || 'ไม่ระบุ',
      menus: booking.selectedMenus.map(m => m.name),
      phone: user?.phone || '—',
    }
    setConfirmedBooking(newBooking)
    setBooking(initialBooking)
  }

  // Owner screens
  if (OWNER_SCREENS.includes(screen)) {
    return (
      <OwnerLayout navigate={navigate} currentScreen={screen}>
        {screen === 'owner-dashboard' && <Dashboard />}
        {screen === 'owner-orders' && <Orders />}
        {screen === 'owner-calendar' && <CalendarView />}
        {screen === 'owner-packages' && <Packages />}
        {screen === 'owner-menus' && <Menus />}
        {screen === 'owner-documents' && <Documents />}
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
        <BookingCalendar navigate={navigate} user={user} onSelectDateTime={handleSelectDateTime} />
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
        <SelectLocation navigate={navigate} user={user} onSetLocation={handleSetLocation} />
      )}
      {screen === 'select-package' && (
        <SelectPackage
          navigate={navigate}
          user={user}
          tables={booking.tables}
          selectedPackageId={booking.packageId}
          onSelectPackage={handleSelectPackage}
        />
      )}
      {screen === 'select-menu' && (
        <SelectMenu
          navigate={navigate}
          user={user}
          menuLimit={booking.menuLimit}
          selectedMenus={booking.selectedMenus}
          onSetMenus={handleSetMenus}
          drinkOption={booking.drinkOption}
          onSetDrinkOption={handleSetDrinkOption}
        />
      )}
      {screen === 'cart' && (
        <Cart navigate={navigate} user={user} booking={booking} onConfirm={handleConfirm} />
      )}
      {screen === 'history' && (
        <BookingHistory navigate={navigate} user={user} newBooking={confirmedBooking} />
      )}
      {screen === 'notifications' && (
        <Notifications navigate={navigate} user={user} />
      )}
    </>
  )
}
