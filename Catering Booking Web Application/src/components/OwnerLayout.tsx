import { useMemo, useState } from 'react'
import {
  BarChart2,
  Bell,
  Book,
  Calendar,
  ChefHat,
  ClipboardList,
  FileBarChart,
  FileText,
  History,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Package,
  Settings,
  Shield,
  X,
} from 'lucide-react'
import Avatar from './Avatar'
import { buildNotifications, isNotificationUnread, timeAgo } from '../notifications'
import { useNav } from '../NavContext'
import type { Booking, Screen } from '../types'
import { resolveImageUrl } from '../api'
import type { ReactNode } from 'react'

const NOTIF_PREVIEW_LIMIT = 6
/** เก็บ per-browser ไม่ใช่ per-account — ต้องล้างตอน logout ไม่งั้น owner คนถัดไปที่ใช้เครื่องเดียวกันจะเห็นค่าเก่าค้าง (ดู App.tsx) */
export const OWNER_NOTIF_SEEN_KEY = 'ownerNotifSeenAt'

interface OwnerLayoutProps {
  currentScreen: Screen
  bookings: Booking[]
  children: ReactNode
}

const sidebarItems = [
  { label: 'แดชบอร์ด', screen: 'owner-dashboard' as Screen, icon: LayoutDashboard },
  { label: 'รายการจอง', screen: 'owner-orders' as Screen, icon: ClipboardList },
  { label: 'ปฏิทิน', screen: 'owner-calendar' as Screen, icon: Calendar },
  { label: 'แพ็กเกจ', screen: 'owner-packages' as Screen, icon: Package },
  { label: 'เมนูอาหาร', screen: 'owner-menus' as Screen, icon: Book },
  { label: 'เอกสาร', screen: 'owner-documents' as Screen, icon: FileText },
  { label: 'รายงาน', screen: 'owner-reports' as Screen, icon: FileBarChart },
  { label: 'สิทธิ์การเข้าถึง', screen: 'owner-users' as Screen, icon: Shield },
  { label: 'ประวัติการแก้ไข', screen: 'owner-audit-log' as Screen, icon: History },
  { label: 'แก้ไขหน้าเว็บ', screen: 'owner-page-content' as Screen, icon: LayoutTemplate },
  { label: 'ตั้งค่า', screen: 'owner-settings' as Screen, icon: Settings },
]

export default function OwnerLayout({ currentScreen, bookings, children }: OwnerLayoutProps) {
  const { navigate, user, shopInfo, openNotificationBooking } = useNav()
  // ต่ำกว่า lg (จอแท็บเล็ตแนวตั้งอย่าง iPad) sidebar ซ่อนเป็น off-canvas drawer เปิดผ่านปุ่มแฮมเบอร์เกอร์
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifSeenAt, setNotifSeenAt] = useState<string>(() => {
    try {
      return localStorage.getItem(OWNER_NOTIF_SEEN_KEY) ?? ''
    } catch {
      return ''
    }
  })
  // ค่า notifSeenAt "ก่อนหน้า" ที่ freeze ไว้ตอนเปิด dropdown รอบนี้ — ใช้ตัดสินจุดสีส้ม/ป้ายใหม่รายรายการ
  // (โชว์สิ่งที่ใหม่ตั้งแต่ครั้งก่อนที่เปิดดู) แยกจาก notifSeenAt ที่อัปเดตทันทีเพื่อให้ตัวเลขที่กระดิ่งหายทันที —
  // ถ้าใช้ notifSeenAt ตัวเดียวกันทั้งคู่ พอเปิด dropdown ค่าจะเท่ากับ "เดี๋ยวนี้" ทำให้ไม่มีรายการไหนขึ้นจุดใหม่เลย
  const [notifPageSeenAt, setNotifPageSeenAt] = useState(notifSeenAt)
  const allNotifItems = useMemo(() => buildNotifications(bookings), [bookings])
  const notifItems = useMemo(() => allNotifItems.slice(0, NOTIF_PREVIEW_LIMIT), [allNotifItems])
  const unreadNotifCount = allNotifItems.filter(item => isNotificationUnread(item, notifSeenAt)).length

  const handleNavigate = (screen: Screen) => {
    navigate(screen)
    setSidebarOpen(false)
  }

  const openNotifications = () => {
    setNotifOpen(true)
    setNotifPageSeenAt(notifSeenAt)
    const now = new Date().toISOString()
    setNotifSeenAt(now)
    try {
      localStorage.setItem(OWNER_NOTIF_SEEN_KEY, now)
    } catch {
      // เพิกเฉยได้ถ้า localStorage ใช้งานไม่ได้ (เช่น private mode) — แค่ตัวเลขจะไม่คงอยู่ข้ามเซสชัน
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col flex-shrink-0 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {shopInfo.logo ? (
              <img src={resolveImageUrl(shopInfo.logo)} alt={shopInfo.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <ChefHat size={20} className="text-white" />
              </div>
            )}
            <div>
              <p className="font-bold text-white leading-tight text-sm">{shopInfo.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">Owner Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
            title="ปิดเมนู"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map(({ label, screen, icon: Icon }) => (
            <button
              key={label}
              onClick={() => handleNavigate(screen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentScreen === screen
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-gray-700/50 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar
              src={user?.avatar}
              name={user?.name || 'เจ้าของร้านพิพัฒน์โภชนา'}
              className="w-9 h-9 rounded-full text-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'เจ้าของร้านพิพัฒน์โภชนา'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email || '—'}</p>
            </div>
            <button
              onClick={() => navigate('login')}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden -ml-1 w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
              title="เปิดเมนู"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-gray-900 text-lg truncate">
              {sidebarItems.find((i) => i.screen === currentScreen)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => (notifOpen ? setNotifOpen(false) : openNotifications())}
                className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                  notifOpen ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'
                }`}
                title="การแจ้งเตือน"
              >
                <Bell size={18} />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  {/* คลิกนอกกล่องเพื่อปิด */}
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">การแจ้งเตือน</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {notifItems.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">ไม่มีการแจ้งเตือน</p>
                      ) : (
                        notifItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setNotifOpen(false)
                              openNotificationBooking(item.bookingId)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                              {isNotificationUnread(item, notifPageSeenAt) && (
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{item.message}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{timeAgo(item.timestamp)}</p>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setNotifOpen(false)
                        navigate('owner-orders')
                      }}
                      className="w-full text-center text-xs font-medium text-orange-600 hover:text-orange-700 py-2.5 border-t border-gray-100 transition-colors"
                    >
                      ดูรายการจองทั้งหมด
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => navigate('home')}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors"
            >
              <BarChart2 size={14} />
              <span className="hidden sm:inline">มุมมองลูกค้า</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
