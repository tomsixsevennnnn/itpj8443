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
import { ArrowUpRight, Calendar, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react'

const MONTHLY_REVENUE = [
  { month: 'ม.ค.', revenue: 45000, bookings: 12 },
  { month: 'ก.พ.', revenue: 52000, bookings: 15 },
  { month: 'มี.ค.', revenue: 48000, bookings: 13 },
  { month: 'เม.ย.', revenue: 61000, bookings: 18 },
  { month: 'พ.ค.', revenue: 55000, bookings: 16 },
  { month: 'มิ.ย.', revenue: 67000, bookings: 20 },
  { month: 'ก.ค.', revenue: 72000, bookings: 22 },
  { month: 'ส.ค.', revenue: 80000, bookings: 25 },
]

const PKG_DATA = [
  { name: 'Standard', value: 35, color: '#60A5FA' },
  { name: 'Premium', value: 45, color: '#F97316' },
  { name: 'VIP', value: 20, color: '#A855F7' },
]

const RECENT = [
  { name: 'สมชาย ใจดี', date: '15 ส.ค.', pkg: 'Premium', amount: 12500, status: 'confirmed' },
  { name: 'วิภา สุขใส', date: '20 ส.ค.', pkg: 'VIP', amount: 38000, status: 'pending' },
  { name: 'นภาพร ดวงจันทร์', date: '5 ก.ย.', pkg: 'Premium', amount: 17500, status: 'pending' },
  { name: 'ชาญชัย มั่นคง', date: '12 ก.ย.', pkg: 'VIP', amount: 30400, status: 'confirmed' },
]

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-500',
}

const STAT_CARDS = [
  { label: 'จำนวนการจองเดือนนี้', value: '25', sub: '+14% จากเดือนก่อน', icon: ShoppingBag, color: 'from-orange-400 to-orange-600' },
  { label: 'รายได้วันนี้', value: '฿ 12,500', sub: '+3 งานวันนี้', icon: DollarSign, color: 'from-blue-400 to-blue-600' },
  { label: 'รายได้เดือนนี้', value: '฿ 80,000', sub: '+18% จากเดือนก่อน', icon: TrendingUp, color: 'from-green-400 to-green-600' },
  { label: 'งานวันนี้', value: '3 งาน', sub: 'เช้า 1 เย็น 2', icon: Calendar, color: 'from-purple-400 to-purple-600' },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
              <p className="text-xs text-gray-400 leading-tight">{card.label}</p>
              <p className="text-xs text-green-600 mt-1.5 font-medium">{card.sub}</p>
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
              <h3 className="font-bold text-gray-900">รายได้รายเดือน</h3>
              <p className="text-xs text-gray-400 mt-0.5">ปี 2568</p>
            </div>
            <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-medium">บาท</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_REVENUE} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
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
            <p className="text-xs text-gray-400 mt-0.5">เดือนนี้</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={PKG_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                {PKG_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ border: 'none', borderRadius: '12px', fontSize: '12px' }} formatter={(v) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {PKG_DATA.map(p => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-gray-600">{p.name}</span>
                </div>
                <span className="font-bold text-gray-800">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-900">จำนวนการจองรายเดือน</h3>
            <p className="text-xs text-gray-400 mt-0.5">ปี 2568</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={MONTHLY_REVENUE} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ border: 'none', borderRadius: '12px', fontSize: '12px' }} formatter={(v) => [v, 'งาน']} />
            <Bar dataKey="bookings" fill="#F97316" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4">การจองล่าสุด</h3>
        <div className="space-y-3">
          {RECENT.map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-sm font-bold text-orange-600">
                {r.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                <p className="text-xs text-gray-400">{r.date} · {r.pkg}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-orange-600">฿{r.amount.toLocaleString()}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                  {r.status === 'confirmed' ? 'ยืนยัน' : 'รอ'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
