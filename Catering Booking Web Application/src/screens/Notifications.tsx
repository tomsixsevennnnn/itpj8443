import { Bell, Calendar, CheckCircle, Clock } from 'lucide-react'
import Navbar from '../components/Navbar'
import type { Screen, ShopInfo, UserProfile } from '../types'

interface NotificationsProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  shopInfo: ShopInfo
}

const NOTIFICATIONS = [
  {
    id: 1,
    type: 'pending',
    title: 'รอการยืนยัน',
    message: 'การจองหมายเลข BK-2025-004 กำลังรอการยืนยันจากเจ้าของร้าน',
    time: '10 นาทีที่แล้ว',
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-100',
  },
  {
    id: 2,
    type: 'confirmed',
    title: 'ยืนยันการจองแล้ว',
    message: 'การจองหมายเลข BK-2025-001 ได้รับการยืนยัน วันที่ 15 สิงหาคม 2568 ช่วงเย็น',
    time: '2 ชั่วโมงที่แล้ว',
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-50',
    border: 'border-green-100',
  },
  {
    id: 3,
    type: 'completed',
    title: 'งานเสร็จสมบูรณ์',
    message: 'งานจัดเลี้ยง BK-2025-003 เสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ',
    time: '3 วันที่แล้ว',
    icon: CheckCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    border: 'border-gray-100',
  },
  {
    id: 4,
    type: 'reminder',
    title: 'แจ้งเตือนงานพรุ่งนี้',
    message: 'อย่าลืม! งานจัดเลี้ยงของคุณ BK-2025-002 จะจัดขึ้นพรุ่งนี้ เวลา 08:00 น.',
    time: '1 วันที่แล้ว',
    icon: Calendar,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    id: 5,
    type: 'pending',
    title: 'รอการยืนยัน',
    message: 'การจองหมายเลข BK-2025-002 กำลังรอการยืนยัน',
    time: '5 วันที่แล้ว',
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-100',
  },
]

export default function Notifications({ navigate, user, shopInfo }: NotificationsProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar navigate={navigate} currentScreen="notifications" user={user} shopInfo={shopInfo} />

      <div className="pt-24 pb-12 max-w-2xl mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell size={24} className="text-orange-500" />
              การแจ้งเตือน
            </h1>
            <p className="text-gray-500 text-sm mt-1">รายการแจ้งเตือนทั้งหมด</p>
          </div>
          <button className="text-sm text-orange-500 hover:text-orange-600 font-medium">
            อ่านทั้งหมด
          </button>
        </div>

        <div className="space-y-3">
          {NOTIFICATIONS.map((notif, i) => {
            const Icon = notif.icon
            const isNew = i < 2
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md ${
                  isNew ? 'border-orange-100' : 'border-gray-100'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 ${notif.bg} border ${notif.border} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={notif.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{notif.title}</p>
                      {isNew && (
                        <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{notif.time}</p>
                  </div>
                  {isNew && (
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">แสดงการแจ้งเตือนทั้งหมดแล้ว</p>
        </div>
      </div>
    </div>
  )
}
