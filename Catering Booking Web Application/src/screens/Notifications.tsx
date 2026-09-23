import { useMemo } from 'react'
import { Bell, CheckCircle, Clock, XCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import { buildNotifications, isNotificationUnread, timeAgo, type NotificationItem, type NotificationKind } from '../notifications'
import { useNav } from '../NavContext'
import type { Booking } from '../types'

interface NotificationsProps {
  bookings: Booking[]
  notifSeenAt: string
}

const KIND_UI: Record<NotificationKind, { icon: typeof Clock; color: string; bg: string; border: string }> = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  reminder: { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
  confirmed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100' },
  completed: { icon: CheckCircle, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-100' },
  cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
}

export default function Notifications({ bookings, notifSeenAt }: NotificationsProps) {
  const { openNotificationBooking } = useNav()
  const items = useMemo(() => buildNotifications(bookings), [bookings])

  const handleClick = (item: NotificationItem) => {
    openNotificationBooking(item.bookingId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentScreen="notifications" />

      <div className="pt-24 pb-12 max-w-2xl mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell size={24} className="text-orange-500" />
              การแจ้งเตือน
            </h1>
            <p className="text-gray-500 text-sm mt-1">รายการแจ้งเตือนทั้งหมด</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex items-center justify-center">
            <p className="text-gray-400 text-sm">ยังไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const ui = KIND_UI[item.kind]
              const Icon = ui.icon
              const isNew = isNotificationUnread(item, notifSeenAt)
              const time = timeAgo(item.timestamp)

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClick(item)}
                  className={`w-full text-left bg-white rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md ${
                    isNew ? 'border-orange-100' : 'border-gray-100'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 ${ui.bg} border ${ui.border} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className={ui.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                        {isNew && (
                          <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{time}</p>
                    </div>
                    {isNew && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">แสดงการแจ้งเตือนทั้งหมดแล้ว</p>
          </div>
        )}
      </div>
    </div>
  )
}
