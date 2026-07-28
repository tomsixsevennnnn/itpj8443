import { Bell, Calendar, ChefHat, Home, LogOut, User } from 'lucide-react'
import type { Screen, UserProfile } from '../types'

interface NavbarProps {
  navigate: (s: Screen) => void
  currentScreen: Screen
  user: UserProfile | null
  notifCount?: number
}

export default function Navbar({ navigate, currentScreen, user, notifCount = 2 }: NavbarProps) {
  const navItems = [
    { label: 'หน้าแรก', screen: 'home' as Screen, icon: Home },
    { label: 'ประวัติการจอง', screen: 'history' as Screen, icon: Calendar },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center group-hover:bg-orange-600 transition-colors">
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-tight text-sm">ร้านพิพัฒน์โภชนา</p>
              <p className="text-[10px] text-gray-400 leading-tight">Catering Service</p>
            </div>
          </button>

          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ label, screen, icon: Icon }) => (
              <button
                key={screen}
                onClick={() => navigate(screen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  currentScreen === screen
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('notifications')}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                currentScreen === 'notifications' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </button>

            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="hidden sm:block text-sm font-medium text-gray-700">{user.name}</span>
              </div>
            )}

            <button
              onClick={() => navigate('login')}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden border-t border-gray-100 bg-white">
        <div className="flex">
          {[
            { label: 'หน้าแรก', screen: 'home' as Screen, icon: Home },
            { label: 'ประวัติ', screen: 'history' as Screen, icon: Calendar },
            { label: 'แจ้งเตือน', screen: 'notifications' as Screen, icon: Bell },
            { label: 'โปรไฟล์', screen: 'home' as Screen, icon: User },
          ].map(({ label, screen, icon: Icon }) => (
            <button
              key={label}
              onClick={() => navigate(screen)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] transition-colors ${
                currentScreen === screen ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
