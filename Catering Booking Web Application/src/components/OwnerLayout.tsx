import {
  BarChart2,
  Bell,
  Book,
  Calendar,
  ChefHat,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Users,
} from 'lucide-react'
import type { Screen, UserProfile } from '../types'
import type { ReactNode } from 'react'

interface OwnerLayoutProps {
  navigate: (s: Screen) => void
  currentScreen: Screen
  user: UserProfile | null
  children: ReactNode
}

const sidebarItems = [
  { label: 'แดชบอร์ด', screen: 'owner-dashboard' as Screen, icon: LayoutDashboard },
  { label: 'รายการจอง', screen: 'owner-orders' as Screen, icon: ClipboardList },
  { label: 'ปฏิทิน', screen: 'owner-calendar' as Screen, icon: Calendar },
  { label: 'แพ็กเกจ', screen: 'owner-packages' as Screen, icon: Package },
  { label: 'เมนูอาหาร', screen: 'owner-menus' as Screen, icon: Book },
  { label: 'เอกสาร', screen: 'owner-documents' as Screen, icon: FileText },
  { label: 'ลูกค้า', screen: 'owner-customers' as Screen, icon: Users },
  { label: 'ตั้งค่า', screen: 'owner-settings' as Screen, icon: Settings },
]

export default function OwnerLayout({ navigate, currentScreen, user, children }: OwnerLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white leading-tight text-sm">ครัวไทย</p>
              <p className="text-[10px] text-gray-400 leading-tight">Owner Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map(({ label, screen, icon: Icon }) => (
            <button
              key={label}
              onClick={() => navigate(screen)}
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
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format'}
              alt="Owner"
              className="w-9 h-9 rounded-full object-cover"
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
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="font-bold text-gray-900 text-lg">
            {sidebarItems.find((i) => i.screen === currentScreen)?.label || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">3</span>
            </button>
            <button
              onClick={() => navigate('home')}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors"
            >
              <BarChart2 size={14} />
              มุมมองลูกค้า
            </button>
          </div>
        </div>

        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
