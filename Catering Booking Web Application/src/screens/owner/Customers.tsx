import { useState } from 'react'
import { Calendar, Phone, Search, ShoppingBag, User, Wallet, X } from 'lucide-react'
import type { Booking } from '../../types'

interface CustomersProps {
  bookings: Booking[]
}

const STATUS_CONFIG = {
  pending: { label: 'รอยืนยัน', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  completed: { label: 'เสร็จสิ้น', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  cancelled: { label: 'ยกเลิก', bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400' },
}

interface CustomerSummary {
  key: string
  name: string
  phone: string
  bookings: Booking[]
  totalSpent: number
  lastDate: string
}

/** รวมใบจองเป็นรายลูกค้า — ระบบยังไม่มีระบบสมาชิก จึงอ้างอิงจากเบอร์โทร (ถ้าไม่มีค่อยใช้ชื่อ) */
const groupByCustomer = (bookings: Booking[]): CustomerSummary[] => {
  const map = new Map<string, CustomerSummary>()
  for (const b of bookings) {
    const key = b.phone && b.phone !== '—' ? b.phone : `name:${b.customerName}`
    const existing = map.get(key)
    if (existing) {
      existing.bookings.push(b)
      if (b.status !== 'cancelled') existing.totalSpent += b.totalPrice
      if (b.date > existing.lastDate) existing.lastDate = b.date
    } else {
      map.set(key, {
        key,
        name: b.customerName,
        phone: b.phone,
        bookings: [b],
        totalSpent: b.status !== 'cancelled' ? b.totalPrice : 0,
        lastDate: b.date,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}

export default function Customers({ bookings }: CustomersProps) {
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const customers = groupByCustomer(bookings)
  const filtered = customers.filter(c =>
    c.name.includes(search) || c.phone.includes(search) || search === ''
  )
  const selected = selectedKey ? customers.find(c => c.key === selectedKey) ?? null : null

  return (
    <div>
      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า หรือเบอร์โทร..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'ลูกค้าทั้งหมด', value: `${customers.length} คน` },
          { label: 'ลูกค้าที่จองมากกว่า 1 ครั้ง', value: `${customers.filter(c => c.bookings.length > 1).length} คน` },
          { label: 'ยอดใช้จ่ายรวมทั้งหมด', value: `฿${customers.reduce((s, c) => s + c.totalSpent, 0).toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-lg font-bold mt-0.5 text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['ลูกค้า', 'เบอร์โทร', 'จำนวนครั้งที่จอง', 'ยอดใช้จ่ายรวม', 'จองล่าสุด', ''].map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(c => (
              <tr
                key={c.key}
                onClick={() => setSelectedKey(c.key)}
                className="hover:bg-orange-50/30 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg text-xs font-bold text-orange-600 flex items-center justify-center">
                      {c.name[0]}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-600">{c.phone}</td>
                <td className="px-4 py-3.5 text-sm text-gray-700">{c.bookings.length} ครั้ง</td>
                <td className="px-4 py-3.5">
                  <span className="font-bold text-orange-600">{c.totalSpent.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 ml-0.5">฿</span>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-600">
                  {new Date(c.lastDate + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-3.5">
                  <button className="text-xs text-orange-600 hover:text-orange-700 font-medium">ดู →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <User size={40} className="mx-auto mb-3 opacity-30" />
            <p>ไม่พบลูกค้า</p>
          </div>
        )}
      </div>

      {/* Detail modal — ประวัติการจองของลูกค้ารายนี้ */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 flex items-center justify-between sticky top-0">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                <p className="text-orange-100 text-sm flex items-center gap-1.5">
                  <Phone size={12} />
                  {selected.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedKey(null)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-3.5 flex items-center gap-2.5">
                  <ShoppingBag size={16} className="text-orange-500" />
                  <div>
                    <p className="text-[10px] text-gray-400">จำนวนครั้งที่จอง</p>
                    <p className="text-sm font-bold text-gray-800">{selected.bookings.length} ครั้ง</p>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-3.5 flex items-center gap-2.5">
                  <Wallet size={16} className="text-orange-500" />
                  <div>
                    <p className="text-[10px] text-orange-500">ยอดใช้จ่ายรวม</p>
                    <p className="text-sm font-bold text-orange-700">฿{selected.totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">ประวัติการจอง</p>
              <div className="space-y-2.5">
                {[...selected.bookings]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(b => {
                    const sc = STATUS_CONFIG[b.status]
                    return (
                      <div key={b.id} className="border border-gray-100 rounded-xl p-3.5">
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                            {b.id}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-400" />
                          {new Date(b.date + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {' · '}{b.timeSlot}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {b.tables} โต๊ะ · {b.packageName} · ฿{b.totalPrice.toLocaleString()}
                        </p>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
