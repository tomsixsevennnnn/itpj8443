import { type Dispatch, type SetStateAction } from 'react'
import { LayoutDashboard } from 'lucide-react'
import type { AppSettings, BookingData, Screen, Booking, EventLocation, MenuItem, Package, QueueBooking } from './types'
import type { SaveSettingsResult } from './screens/owner/useSettingsForm'
import { api, type BackendUser, type CreatePackageInput, type ShopAdmin, type UpdatePackageInput, type UploadImageKind } from './api'
import ErrorBanner from './components/ErrorBanner'
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
import { NavProvider, type NavContextValue } from './NavContext'
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


export type AppRoleForPath = 'owner' | 'customer' | 'super_admin'

export interface SuperAdminScreenProps {
  navContext: NavContextValue
  actionError: string | null
  setActionError: Dispatch<SetStateAction<string | null>>
  shopsAdmin: ShopAdmin[]
  ownersAdmin: BackendUser[]
  setShopsAdmin: Dispatch<SetStateAction<ShopAdmin[]>>
  setOwnersAdmin: Dispatch<SetStateAction<BackendUser[]>>
  runAction: (fn: () => Promise<void>) => Promise<void>
  withToken: () => Promise<string>
  auditRefreshSignal: number
}

/** หน้าจอ super admin — แยกออกจาก App component กันฟังก์ชันหลักซับซ้อนเกิน (คัดลอก JSX เดิมมาตรงๆ ไม่เปลี่ยนตรรกะ) */
export function SuperAdminScreen({
  navContext, actionError, setActionError, shopsAdmin, ownersAdmin, setShopsAdmin, setOwnersAdmin, runAction, withToken, auditRefreshSignal,
}: Readonly<SuperAdminScreenProps>) {
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

export interface OwnerScreensProps {
  navContext: NavContextValue
  effectiveScreen: Screen
  actionError: string | null
  setActionError: Dispatch<SetStateAction<string | null>>
  bookings: Booking[]
  menus: MenuItem[]
  settings: AppSettings
  packages: Package[]
  handleUpdateBooking: (id: string, patch: Partial<Booking>) => Promise<boolean>
  handleFetchPaymentSlip: (bookingId: string) => Promise<string>
  pendingNotifBookingId: string | null
  setPendingNotifBookingId: Dispatch<SetStateAction<string | null>>
  handleCreatePackage: (input: CreatePackageInput) => Promise<void>
  handleUpdatePackage: (id: string, input: UpdatePackageInput) => Promise<void>
  handleDeletePackage: (id: string) => Promise<void>
  handleReorderPackages: (ids: string[]) => Promise<void>
  handleSaveMenu: (item: MenuItem) => Promise<void>
  handleDeleteMenu: (id: string) => Promise<void>
  handleUploadImage: (kind: UploadImageKind, dataUrl: string) => Promise<string>
  handleUpdateSettings: (patch: Partial<AppSettings>) => Promise<SaveSettingsResult>
  withToken: () => Promise<string>
  auth0UserSub: string | undefined
  usersRefreshSignal: number
  auditRefreshSignal: number
}

/** หน้าจอฝั่งเจ้าของร้าน (สลับตาม effectiveScreen) — แยกออกจาก App component กันฟังก์ชันหลักซับซ้อนเกิน
 *  (คัดลอก JSX เดิมมาตรงๆ ไม่เปลี่ยนตรรกะ) */
export function OwnerScreens({
  navContext, effectiveScreen, actionError, setActionError, bookings, menus, settings, packages,
  handleUpdateBooking, handleFetchPaymentSlip, pendingNotifBookingId, setPendingNotifBookingId,
  handleCreatePackage, handleUpdatePackage, handleDeletePackage, handleReorderPackages,
  handleSaveMenu, handleDeleteMenu, handleUploadImage, handleUpdateSettings, withToken,
  auth0UserSub, usersRefreshSignal, auditRefreshSignal,
}: Readonly<OwnerScreensProps>) {
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
          <Settings
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onUploadImage={handleUploadImage}
            onResolveMapsLink={url => withToken().then(token => api.resolveMapsLink(token, url))}
            onTestSlipOk={(apiKey, branchId) => withToken().then(token => api.testSlipOk(token, apiKey, branchId))}
          />
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
            currentAuth0Sub={auth0UserSub}
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

export interface CustomerScreensProps {
  navContext: NavContextValue
  actionError: string | null
  setActionError: Dispatch<SetStateAction<string | null>>
  role: AppRoleForPath
  navigate: (s: Screen) => void
  effectiveScreen: Screen
  availability: QueueBooking[]
  handleSelectDateTime: (date: string, timeSlot: string) => void
  settings: AppSettings
  booking: BookingData
  handleSetTables: (n: number) => void
  handleSetLocation: (loc: EventLocation) => void
  handleResolveMapsLink: (url: string) => Promise<string>
  packages: Package[]
  handleSelectPackage: (pkg: Package) => void
  handleSetMenus: (menus: MenuItem[]) => void
  handleConfirm: () => Promise<boolean>
  locationRecalculating: boolean
  bookings: Booking[]
  handleUpdateBooking: (id: string, patch: Partial<Booking>) => Promise<boolean>
  handleFetchPaymentSlip: (bookingId: string) => Promise<string>
  pendingNotifBookingId: string | null
  setPendingNotifBookingId: Dispatch<SetStateAction<string | null>>
  notifPageSeenAt: string
}

/** หน้าจอฝั่งลูกค้า (สลับตาม effectiveScreen) — แยกออกจาก App component กันฟังก์ชันหลักซับซ้อนเกิน
 *  (คัดลอก JSX เดิมมาตรงๆ ไม่เปลี่ยนตรรกะ) */
export function CustomerScreens({
  navContext, actionError, setActionError, role, navigate, effectiveScreen, availability, handleSelectDateTime,
  settings, booking, handleSetTables, handleSetLocation, handleResolveMapsLink, packages, handleSelectPackage,
  handleSetMenus, handleConfirm, locationRecalculating, bookings, handleUpdateBooking, handleFetchPaymentSlip, pendingNotifBookingId,
  setPendingNotifBookingId, notifPageSeenAt,
}: Readonly<CustomerScreensProps>) {
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
          recalculating={locationRecalculating}
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
