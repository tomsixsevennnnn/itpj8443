import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, Calendar, Clock, DollarSign, ShoppingBag, Users } from 'lucide-react'
import type { Booking } from '../../types'
import { BOOKING_STATUS_INFO, TIME_SLOTS, slotIdOf } from '../../availability'
import { calculateStaff, sumStaff, toPlan } from '../../staffing'

interface DashboardProps {
  bookings: Booking[]
}

const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const PIE_COLORS = ['#F97316', '#60A5FA', '#A855F7', '#34D399', '#FBBF24', '#F472B6']
const MONTHS_SHOWN = 8

const monthKeyOf = (date: string) => date.slice(0, 7)
const toMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const SLOT_LABEL = Object.fromEntries(TIME_SLOTS.map(s => [s.id, s.label])) as Record<string, string>

/** เปอร์เซ็นต์การเปลี่ยนแปลงเทียบเดือนก่อน (กันหารศูนย์) */
const pctChange = (now: number, prev: number): number | null => {
  if (prev === 0) return now > 0 ? 100 : null
  return Math.round(((now - prev) / prev) * 100)
}

export default function Dashboard({ bookings }: DashboardProps) {
  const stats = useMemo(() => {
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const thisMonth = toMonthKey(today)
    const prevMonth = toMonthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1))

    // งานที่ยกเลิกไม่นับเป็นรายได้และไม่นับเป็นงาน
    const active = bookings.filter(b => b.status !== 'cancelled')

    const inMonth = (key: string) => active.filter(b => monthKeyOf(b.date) === key)
    const revenueOf = (list: Booking[]) => list.reduce((sum, b) => sum + b.totalPrice, 0)

    const thisMonthList = inMonth(thisMonth)
    const prevMonthList = inMonth(prevMonth)

    const todayList = active.filter(b => b.date === todayKey)
    const todaySlots = todayList.reduce<Record<string, number>>((acc, b) => {
      const slot = slotIdOf(b.timeSlot)
      acc[slot] = (acc[slot] ?? 0) + 1
      return acc
    }, {})

    const pending = bookings.filter(b => b.status === 'pending')

    // กราฟ 8 เดือนล่าสุด (ย้อนหลังจากเดือนปัจจุบัน)
    const monthly = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (MONTHS_SHOWN - 1 - i), 1)
      const list = inMonth(toMonthKey(d))
      return {
        month: MONTHS_SHORT[d.getMonth()],
        revenue: revenueOf(list),
        bookings: list.length,
        tables: list.reduce((sum, b) => sum + b.tables, 0),
      }
    })

    // สัดส่วนแพ็กเกจ คิดจากงานจริงทั้งหมด
    const pkgMap = new Map<string, { count: number; revenue: number }>()
    for (const b of active) {
      const cur = pkgMap.get(b.packageName) ?? { count: 0, revenue: 0 }
      pkgMap.set(b.packageName, { count: cur.count + 1, revenue: cur.revenue + b.totalPrice })
    }
    const pkgTotal = active.length
    const packages = [...pkgMap.entries()]
      .map(([name, v], i) => ({
        name,
        value: pkgTotal > 0 ? Math.round((v.count / pkgTotal) * 100) : 0,
        count: v.count,
        revenue: v.revenue,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count)

    // งานที่ใกล้ถึง (วันนี้เป็นต้นไป)
    const upcoming = active
      .filter(b => b.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)

    // กำลังคนที่ต้องใช้ในงานที่ใกล้ถึง
    const upcomingStaff = upcoming.reduce(
      (sum, b) => sum + sumStaff(b.staffActual ?? toPlan(calculateStaff(b.tables))),
      0
    )

    return {
      todayKey,
      todayList,
      todaySlots,
      pending,
      pendingValue: revenueOf(pending),
      thisMonthCount: thisMonthList.length,
      thisMonthRevenue: revenueOf(thisMonthList),
      thisMonthTables: thisMonthList.reduce((sum, b) => sum + b.tables, 0),
      bookingChange: pctChange(thisMonthList.length, prevMonthList.length),
      revenueChange: pctChange(revenueOf(thisMonthList), revenueOf(prevMonthList)),
      monthly,
      packages,
      upcoming,
      upcomingStaff,
      buddhistYear: today.getFullYear() + 543,
    }
  }, [bookings])

  const todaySlotText =
    stats.todayList.length > 0
      ? Object.entries(stats.todaySlots)
          .map(([slot, n]) => `${SLOT_LABEL[slot] ?? slot} ${n}`)
          .join(' · ')
      : 'ไม่มีงานวันนี้'

  const cards = [
    {
      label: 'งานเดือนนี้',
      value: `${stats.thisMonthCount} งาน`,
      sub: `รวม ${stats.thisMonthTables.toLocaleString()} โต๊ะ`,
      change: stats.bookingChange,
      icon: ShoppingBag,
      color: 'from-orange-400 to-orange-600',
    },
    {
      label: 'รายได้เดือนนี้',
      value: `฿${stats.thisMonthRevenue.toLocaleString()}`,
      sub: 'ไม่รวมงานที่ยกเลิก',
      change: stats.revenueChange,
      icon: DollarSign,
      color: 'from-green-400 to-green-600',
    },
    {
      label: 'งานวันนี้',
      value: `${stats.todayList.length} งาน`,
      sub: todaySlotText,
      change: null,
      icon: Calendar,
      color: 'from-purple-400 to-purple-600',
    },
    {
      label: 'รอยืนยัน',
      value: `${stats.pending.length} งาน`,
      sub: `มูลค่า ฿${stats.pendingValue.toLocaleString()}`,
      change: null,
      icon: Clock,
      color: 'from-yellow-400 to-amber-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          const up = card.change != null && card.change >= 0
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
                {card.change != null && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
                    {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(card.change)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
              <p className="text-xs text-gray-400 leading-tight">{card.label}</p>
              <p className="text-xs text-gray-500 mt-1.5 leading-tight">
                {card.change != null && (
                  <span className={up ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                    {up ? '+' : ''}{card.change}% จากเดือนก่อน ·{' '}
                  </span>
                )}
                {card.sub}
              </p>
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid xl:grid-cols-3 gap-5">
        {/* Revenue area chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">รายได้ย้อนหลัง {MONTHS_SHOWN} เดือน</h3>
              <p className="text-xs text-gray-400 mt-0.5">ถึงเดือนปัจจุบัน ปี {stats.buddhistYear}</p>
            </div>
            <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-medium">บาท</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.monthly} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                formatter={(v) => [`฿${Number(v).toLocaleString()}`, 'รายได้']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 4, fill: '#F97316', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Package pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-5">
            <h3 className="font-bold text-gray-900">แพ็กเกจยอดนิยม</h3>
            <p className="text-xs text-gray-400 mt-0.5">จากงานทั้งหมด {stats.packages.reduce((s, p) => s + p.count, 0)} งาน</p>
          </div>

          {stats.packages.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-sm text-gray-400">ยังไม่มีข้อมูลการจอง</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={stats.packages} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="count">
                    {stats.packages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ border: 'none', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(v, _n, item) => [`${v} งาน (${item?.payload?.value ?? 0}%)`, item?.payload?.name ?? '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {stats.packages.map(p => (
                  <div key={p.name} className="flex items-center justify-between text-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-gray-600 truncate">{p.name}</span>
                    </div>
                    <span className="font-bold text-gray-800 flex-shrink-0">{p.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bookings bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-900">จำนวนงานและโต๊ะรายเดือน</h3>
            <p className="text-xs text-gray-400 mt-0.5">ย้อนหลัง {MONTHS_SHOWN} เดือน</p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: 'จำนวนงาน', color: '#F97316' },
              { label: 'จำนวนโต๊ะ', color: '#FDBA74' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-xs text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.monthly} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ border: 'none', borderRadius: '12px', fontSize: '12px' }}
              formatter={(v, name) => [v, name === 'bookings' ? 'งาน' : 'โต๊ะ']}
            />
            <Bar yAxisId="left" dataKey="bookings" fill="#F97316" radius={[6, 6, 0, 0]} />
            <Bar yAxisId="right" dataKey="tables" fill="#FDBA74" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Upcoming events */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">งานที่ใกล้ถึง</h3>
          {stats.upcoming.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Users size={13} className="text-orange-500" />
              ต้องใช้พนักงานรวม {stats.upcomingStaff} คน
            </span>
          )}
        </div>

        {stats.upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีงานที่จองไว้ล่วงหน้า</p>
        ) : (
          <div className="space-y-3">
            {stats.upcoming.map((b) => {
              const info = BOOKING_STATUS_INFO[b.status]
              const daysLeft = Math.round(
                (new Date(b.date + 'T00:00:00').getTime() - new Date(stats.todayKey + 'T00:00:00').getTime()) / 86400000
              )
              const staff = sumStaff(b.staffActual ?? toPlan(calculateStaff(b.tables)))
              return (
                <div key={b.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-sm font-bold text-orange-600 flex-shrink-0">
                    {b.customerName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{b.customerName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {new Date(b.date + 'T00:00:00').toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                      {' · '}{b.tables} โต๊ะ · {b.packageName} · พนักงาน {staff} คน
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-orange-600">฿{b.totalPrice.toLocaleString()}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-400">
                        {daysLeft === 0 ? 'วันนี้' : `อีก ${daysLeft} วัน`}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${info.chip}`}>
                        {info.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
