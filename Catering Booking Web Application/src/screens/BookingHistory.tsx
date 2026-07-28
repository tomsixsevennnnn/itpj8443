import { useState } from 'react'
import { Calendar, Download, Eye, FileText, Filter, Search } from 'lucide-react'
import Navbar from '../components/Navbar'
import type { Booking, Screen, UserProfile } from '../types'
import { MOCK_BOOKINGS } from '../data'

interface BookingHistoryProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  newBooking?: Booking | null
}

const STATUS_CONFIG = {
  pending: { label: 'รอยืนยัน', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  completed: { label: 'เสร็จสิ้น', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  cancelled: { label: 'ยกเลิก', bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400' },
}

export default function BookingHistory({ navigate, user, newBooking }: BookingHistoryProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailId, setDetailId] = useState<string | null>(null)

  const allBookings = newBooking ? [newBooking, ...MOCK_BOOKINGS] : MOCK_BOOKINGS

  const filtered = allBookings.filter(b => {
    const matchSearch = b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName.includes(search) || search === ''
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const detailBooking = allBookings.find(b => b.id === detailId)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar navigate={navigate} currentScreen="history" user={user} />

      <div className="pt-24 pb-12 max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={24} className="text-orange-500" />
            ประวัติการจอง
          </h1>
          <p className="text-gray-500 text-sm mt-1">รายการจองทั้งหมดของคุณ</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่จอง หรือชื่อ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <div className="flex gap-1">
                {['all', 'pending', 'confirmed', 'completed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-xs px-3 py-2 rounded-xl transition-colors font-medium ${
                      statusFilter === s
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s === 'all' ? 'ทั้งหมด' :
                     s === 'pending' ? 'รอยืนยัน' :
                     s === 'confirmed' ? 'ยืนยันแล้ว' : 'เสร็จสิ้น'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['เลขที่จอง', 'วันที่จัดงาน', 'ช่วงเวลา', 'โต๊ะ', 'แพ็กเกจ', 'ราคารวม', 'สถานะ', 'จัดการ'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((booking) => {
                  const sc = STATUS_CONFIG[booking.status]
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{booking.id}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {new Date(booking.date + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{booking.timeSlot}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{booking.tables} โต๊ะ</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{booking.packageName}</td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-orange-600">{booking.totalPrice.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-0.5">฿</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setDetailId(booking.id)}
                            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-600 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Eye size={12} />
                            ดู
                          </button>
                          <button className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 px-2.5 py-1.5 rounded-lg transition-colors">
                            <FileText size={12} />
                            ใบเสนอ
                          </button>
                          <button className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-green-50 hover:text-green-600 text-gray-600 px-2.5 py-1.5 rounded-lg transition-colors">
                            <Download size={12} />
                            ใบจอง
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((booking) => {
              const sc = STATUS_CONFIG[booking.status]
              return (
                <div key={booking.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{booking.id}</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    {new Date(booking.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">{booking.timeSlot} · {booking.tables} โต๊ะ · {booking.packageName}</p>
                  <p className="text-lg font-bold text-orange-600">{booking.totalPrice.toLocaleString()} ฿</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setDetailId(booking.id)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">รายละเอียด</button>
                    <button className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">ใบเสนอราคา</button>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p>ไม่พบรายการจอง</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detailBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 flex items-center justify-between sticky top-0">
              <div>
                <h3 className="text-lg font-bold text-white">รายละเอียดการจอง</h3>
                <p className="text-orange-100 text-sm">{detailBooking.id}</p>
              </div>
              <button
                onClick={() => setDetailId(null)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'ชื่อลูกค้า', value: detailBooking.customerName },
                { label: 'วันที่', value: new Date(detailBooking.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { label: 'ช่วงเวลา', value: detailBooking.timeSlot },
                { label: 'จำนวนโต๊ะ', value: `${detailBooking.tables} โต๊ะ` },
                { label: 'จำนวนคนที่ใช้สำหรับงาน', value: `${detailBooking.guestCount ?? detailBooking.tables * 10} คน` },
                { label: 'แพ็กเกจ', value: detailBooking.packageName },
                { label: 'สถานที่', value: detailBooking.location },
                { label: 'เบอร์โทร', value: detailBooking.phone },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="font-medium text-gray-800 text-right ml-4">{value}</span>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-400 mb-2">รายการอาหาร</p>
                <div className="flex flex-wrap gap-1.5">
                  {detailBooking.menus.map(m => (
                    <span key={m} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{m}</span>
                  ))}
                </div>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between">
                <span className="font-bold text-gray-800">ราคารวม</span>
                <span className="text-xl font-bold text-orange-600">{detailBooking.totalPrice.toLocaleString()} ฿</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
