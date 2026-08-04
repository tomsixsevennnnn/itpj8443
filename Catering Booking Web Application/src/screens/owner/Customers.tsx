import { useMemo, useState } from 'react'
import { MapPin, MessageCircle, Phone, TrendingUp, User, Users, Wallet } from 'lucide-react'
import type { AppSettings, Booking, MenuItem } from '../../types'
import { bookingCostSummary } from '../../costing'

interface CustomersProps {
  bookings: Booking[]
  menus: MenuItem[]
  settings: AppSettings
}

const STATUS_CONFIG = {
  pending: { label: 'รอยืนยัน', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  completed: { label: 'เสร็จสิ้น', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  cancelled: { label: 'ยกเลิก', bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400' },
}

export default function Customers({ bookings, menus, settings }: CustomersProps) {
  const [nameFilter, setNameFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [lineIdFilter, setLineIdFilter] = useState('')

  const rows = useMemo(() => {
    const filtered = bookings.filter(b =>
      b.customerName.toLowerCase().includes(nameFilter.trim().toLowerCase()) &&
      b.phone.includes(phoneFilter.trim()) &&
      (b.lineId ?? '').toLowerCase().includes(lineIdFilter.trim().toLowerCase())
    )
    return filtered
      .map(b => ({ booking: b, cost: bookingCostSummary(b, menus, settings) }))
      .sort((a, b) => b.booking.date.localeCompare(a.booking.date))
  }, [bookings, nameFilter, phoneFilter, lineIdFilter, menus, settings])

  // งานที่ยกเลิกไม่นับรวมในยอดรายได้/ต้นทุน/กำไร
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, { booking, cost }) => {
        if (booking.status === 'cancelled') return acc
        acc.revenue += booking.totalPrice
        acc.cost += cost.totalCost
        acc.profit += cost.profit
        return acc
      },
      { revenue: 0, cost: 0, profit: 0 }
    )
  }, [rows])

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'รายได้รวม', value: totals.revenue, icon: Wallet, color: 'from-green-400 to-green-600' },
          { label: 'ต้นทุนรวม', value: totals.cost, icon: Users, color: 'from-rose-400 to-rose-600' },
          { label: 'กำไรรวม', value: totals.profit, icon: TrendingUp, color: 'from-teal-400 to-teal-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-lg font-bold mt-0.5 text-gray-900">฿{value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ชื่อลูกค้า"
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="เบอร์โทร"
              value={phoneFilter}
              onChange={e => setPhoneFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="relative">
            <MessageCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Line ID"
              value={lineIdFilter}
              onChange={e => setLineIdFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['ลูกค้า', 'เบอร์โทร', 'จำนวนโต๊ะ', 'สถานที่', 'วันที่', 'ต้นทุนต่องาน', 'รายได้', 'กำไร', 'สถานะ'].map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(({ booking: b, cost }) => {
              const sc = STATUS_CONFIG[b.status]
              return (
                <tr key={b.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg text-xs font-bold text-orange-600 flex items-center justify-center flex-shrink-0">
                        {b.customerName[0]}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{b.customerName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{b.phone}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">{b.tables} โต๊ะ</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600 max-w-[220px] truncate">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                      {b.location}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(b.date + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">฿{cost.totalCost.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-gray-800 whitespace-nowrap">฿{b.totalPrice.toLocaleString()}</td>
                  <td className={`px-4 py-3.5 text-sm font-bold whitespace-nowrap ${cost.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ฿{cost.profit.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <User size={40} className="mx-auto mb-3 opacity-30" />
            <p>ไม่พบลูกค้า</p>
          </div>
        )}
      </div>
    </div>
  )
}
