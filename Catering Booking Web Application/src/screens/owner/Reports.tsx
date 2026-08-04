import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Calendar, CalendarDays, ShoppingBag, TrendingUp, Users, Wallet } from 'lucide-react'
import type { AppSettings, Booking, MenuItem } from '../../types'
import { bookingCostSummary } from '../../costing'

interface ReportsProps {
  bookings: Booking[]
  menus: MenuItem[]
  settings: AppSettings
}

type Mode = 'month' | 'year'

interface PeriodRow {
  key: string
  label: string
  count: number
  tables: number
  revenue: number
  cost: number
  profit: number
}

const MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const emptyRow = (key: string, label: string): PeriodRow => ({ key, label, count: 0, tables: 0, revenue: 0, cost: 0, profit: 0 })

export default function Reports({ bookings, menus, settings }: ReportsProps) {
  const [mode, setMode] = useState<Mode>('month')
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())

  // งานที่ยกเลิกไม่นับรวมในรายงาน
  const active = useMemo(() => bookings.filter(b => b.status !== 'cancelled'), [bookings])

  const years = useMemo(() => {
    const set = new Set(active.map(b => Number(b.date.slice(0, 4))))
    set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [active])

  const monthRows = useMemo(() => {
    const rows = MONTHS_FULL.map((label, i) => emptyRow(String(i + 1).padStart(2, '0'), label))
    for (const b of active) {
      const year = Number(b.date.slice(0, 4))
      if (year !== selectedYear) continue
      const row = rows[Number(b.date.slice(5, 7)) - 1]
      const cost = bookingCostSummary(b, menus, settings)
      row.count += 1
      row.tables += b.tables
      row.revenue += b.totalPrice
      row.cost += cost.totalCost
      row.profit += cost.profit
    }
    return rows
  }, [active, selectedYear, menus, settings])

  const yearRows = useMemo(() => {
    const map = new Map<number, PeriodRow>()
    for (const b of active) {
      const year = Number(b.date.slice(0, 4))
      const row = map.get(year) ?? emptyRow(String(year), `ปี ${year + 543}`)
      const cost = bookingCostSummary(b, menus, settings)
      row.count += 1
      row.tables += b.tables
      row.revenue += b.totalPrice
      row.cost += cost.totalCost
      row.profit += cost.profit
      map.set(year, row)
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key))
  }, [active, menus, settings])

  const rows = mode === 'month' ? monthRows : yearRows

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          count: acc.count + r.count,
          tables: acc.tables + r.tables,
          revenue: acc.revenue + r.revenue,
          cost: acc.cost + r.cost,
          profit: acc.profit + r.profit,
        }),
        { count: 0, tables: 0, revenue: 0, cost: 0, profit: 0 }
      ),
    [rows]
  )

  const chartData =
    mode === 'month'
      ? monthRows.map((r, i) => ({ label: MONTHS_SHORT[i], รายได้: r.revenue, กำไร: r.profit }))
      : [...yearRows]
          .sort((a, b) => a.key.localeCompare(b.key))
          .map(r => ({ label: `${Number(r.key) + 543}`, รายได้: r.revenue, กำไร: r.profit }))

  const cards = [
    { label: mode === 'month' ? `จำนวนงานปี ${selectedYear + 543}` : 'จำนวนงานทั้งหมด', value: `${totals.count} งาน`, icon: ShoppingBag, color: 'from-orange-400 to-orange-600' },
    { label: 'รายได้รวม', value: `฿${totals.revenue.toLocaleString()}`, icon: Wallet, color: 'from-green-400 to-green-600' },
    { label: 'ต้นทุนรวม', value: `฿${totals.cost.toLocaleString()}`, icon: Users, color: 'from-rose-400 to-rose-600' },
    { label: 'กำไรรวม', value: `฿${totals.profit.toLocaleString()}`, icon: TrendingUp, color: 'from-teal-400 to-teal-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Mode toggle + year selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex bg-white border border-gray-100 rounded-xl shadow-sm p-1">
          {[
            { value: 'month' as Mode, label: 'สรุปรายเดือน', icon: Calendar },
            { value: 'year' as Mode, label: 'สรุปรายปี', icon: CalendarDays },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === value ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {mode === 'month' && (
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="border border-gray-200 rounded-xl text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {years.map(y => (
              <option key={y} value={y}>ปี {y + 543}</option>
            ))}
          </select>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-4`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
            <p className="text-xs text-gray-400 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="mb-5">
          <h3 className="font-bold text-gray-900">
            {mode === 'month' ? `รายได้และกำไรรายเดือน ปี ${selectedYear + 543}` : 'รายได้และกำไรรายปี'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">ไม่รวมงานที่ยกเลิก</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
              formatter={(v) => `฿${Number(v).toLocaleString()}`}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="รายได้" fill="#F97316" radius={[6, 6, 0, 0]} />
            <Bar dataKey="กำไร" fill="#34D399" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {[mode === 'month' ? 'เดือน' : 'ปี', 'จำนวนงาน', 'จำนวนโต๊ะ', 'รายได้', 'ต้นทุน', 'กำไร', 'มาร์จิ้น'].map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => {
              const margin = r.revenue > 0 ? Math.round((r.profit / r.revenue) * 100) : null
              return (
                <tr key={r.key} className={`hover:bg-orange-50/30 transition-colors ${r.count === 0 ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3.5 text-sm font-semibold text-gray-800 whitespace-nowrap">{r.label}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{r.count} งาน</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{r.tables.toLocaleString()} โต๊ะ</td>
                  <td className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">฿{r.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">฿{r.cost.toLocaleString()}</td>
                  <td className={`px-4 py-3.5 text-sm font-bold whitespace-nowrap ${r.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ฿{r.profit.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{margin != null ? `${margin}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-100 font-bold text-gray-900">
              <td className="px-4 py-3.5 text-sm whitespace-nowrap">รวมทั้งหมด</td>
              <td className="px-4 py-3.5 text-sm whitespace-nowrap">{totals.count} งาน</td>
              <td className="px-4 py-3.5 text-sm whitespace-nowrap">{totals.tables.toLocaleString()} โต๊ะ</td>
              <td className="px-4 py-3.5 text-sm whitespace-nowrap">฿{totals.revenue.toLocaleString()}</td>
              <td className="px-4 py-3.5 text-sm whitespace-nowrap">฿{totals.cost.toLocaleString()}</td>
              <td className={`px-4 py-3.5 text-sm whitespace-nowrap ${totals.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                ฿{totals.profit.toLocaleString()}
              </td>
              <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                {totals.revenue > 0 ? `${Math.round((totals.profit / totals.revenue) * 100)}%` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>

        {totals.count === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
            <p>ยังไม่มีข้อมูลการจองใน{mode === 'month' ? `ปี ${selectedYear + 543}` : 'ช่วงเวลานี้'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
