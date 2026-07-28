import { useState } from 'react'
import { Check, MapPin, Search, X } from 'lucide-react'
import type { Booking } from '../../types'
import { MOCK_BOOKINGS } from '../../data'

const STATUS_CONFIG = {
  pending: { label: 'รอยืนยัน', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  completed: { label: 'เสร็จสิ้น', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  cancelled: { label: 'ยกเลิก', bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400' },
}

export default function Orders() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [_drawerStatus, setDrawerStatus] = useState<Booking['status'] | null>(null)
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS)

  const filtered = bookings.filter(b =>
    b.customerName.includes(search) || b.id.includes(search) || search === ''
  )

  const updateStatus = (id: string, status: Booking['status']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Search + filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า หรือเลขที่จอง..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <div className="flex gap-5 flex-1">
        {/* Table */}
        <div className={`flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all ${selected ? 'hidden xl:block' : ''}`}>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['ชื่อลูกค้า', 'วันที่', 'ช่วงเวลา', 'โต๊ะ', 'แพ็กเกจ', 'ราคารวม', 'สถานะ', ''].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(booking => {
                const sc = STATUS_CONFIG[booking.status]
                return (
                  <tr
                    key={booking.id}
                    className={`hover:bg-orange-50/30 transition-colors cursor-pointer ${selected?.id === booking.id ? 'bg-orange-50' : ''}`}
                    onClick={() => { setSelected(booking); setDrawerStatus(booking.status) }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg text-xs font-bold text-orange-600 flex items-center justify-center">
                          {booking.customerName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{booking.customerName}</p>
                          <p className="text-xs text-gray-400">{booking.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {new Date(booking.date + 'T00:00:00').toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{booking.timeSlot}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-700">{booking.tables}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-700">{booking.packageName}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-orange-600">{booking.totalPrice.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 ml-0.5">฿</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button className="text-xs text-orange-600 hover:text-orange-700 font-medium">ดู →</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Drawer */}
        {selected && (
          <div className="w-96 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Drawer header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 flex items-start justify-between">
              <div>
                <p className="font-bold text-white text-lg">{selected.customerName}</p>
                <p className="text-orange-100 text-xs">{selected.id}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Customer info */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">ข้อมูลลูกค้า</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'เบอร์โทร', value: selected.phone },
                    { label: 'วันที่', value: new Date(selected.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) },
                    { label: 'ช่วงเวลา', value: selected.timeSlot },
                    { label: 'จำนวนโต๊ะ', value: `${selected.tables} โต๊ะ` },
                    { label: 'จำนวนคนที่ใช้สำหรับงาน', value: `${selected.guestCount ?? selected.tables * 10} คน` },
                    { label: 'พนักงานที่ต้องใช้', value: `${Math.max(1, Math.ceil(selected.tables / 2))} คน` },
                    { label: 'แพ็กเกจ', value: selected.packageName },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-400">{label}</span>
                      <span className="font-medium text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">สถานที่</p>
                <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                  <MapPin size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{selected.location}</p>
                </div>
                {/* Mini map preview */}
                <div className="mt-2 h-24 rounded-xl overflow-hidden bg-gray-200 relative">
                  <img
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&h=200&fit=crop&auto=format"
                    alt="map"
                    className="w-full h-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                      <MapPin size={14} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu list */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">รายการอาหาร</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.menus.map(m => (
                    <span key={m} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-full">{m}</span>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
                <span className="font-bold text-gray-800">ราคารวม</span>
                <span className="text-xl font-bold text-orange-600">฿{selected.totalPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Status buttons */}
            <div className="p-5 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-400 mb-3">อัปเดตสถานะ</p>
              <div className="grid grid-cols-3 gap-2">
                {(['pending', 'confirmed', 'completed'] as const).map(s => {
                  const sc = STATUS_CONFIG[s]
                  const isActive = selected.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      className={`flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive ? `${sc.bg} ${sc.text} border-2 ${s === 'confirmed' ? 'border-green-300' : s === 'pending' ? 'border-yellow-300' : 'border-gray-300'}` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {isActive && <Check size={12} />}
                      {sc.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
