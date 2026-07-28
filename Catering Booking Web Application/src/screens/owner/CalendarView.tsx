import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { MOCK_BOOKINGS } from '../../data'
import type { Booking } from '../../types'

const MONTHS_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]
const DAYS_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

const STATUS_COLORS = {
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  completed: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function CalendarView() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [popup, setPopup] = useState<Booking | null>(null)

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const getEvents = (day: number) => {
    const key = formatDate(year, month, day)
    return MOCK_BOOKINGS.filter(b => b.date === key)
  }

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {[
          { label: 'ยืนยันแล้ว', color: 'bg-green-400' },
          { label: 'รอยืนยัน', color: 'bg-yellow-400' },
          { label: 'เสร็จสิ้น', color: 'bg-gray-300' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-sm text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h2 className="font-bold text-gray-900 text-lg">{MONTHS_TH[month]} {year + 543}</h2>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_TH.map((d, i) => (
            <div key={d} className={`py-3 text-center text-xs font-semibold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const events = day ? getEvents(day) : []
            const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
            const dow = idx % 7

            return (
              <div
                key={idx}
                className={`min-h-[110px] p-2 border-b border-r border-gray-50 ${
                  !day ? 'bg-gray-50/50' : 'hover:bg-orange-50/20 transition-colors'
                }`}
              >
                {day && (
                  <>
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                      isToday ? 'bg-orange-500 text-white' :
                      dow === 0 ? 'text-red-500' :
                      dow === 6 ? 'text-blue-500' : 'text-gray-700'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {events.map(ev => {
                        const colorClass = ev.status === 'confirmed' ? 'bg-green-100 text-green-700 border-green-200' :
                          ev.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                          'bg-gray-100 text-gray-500 border-gray-200'
                        return (
                          <button
                            key={ev.id}
                            onClick={() => setPopup(ev)}
                            className={`w-full text-left text-[10px] font-medium px-1.5 py-1 rounded-lg border truncate transition-all hover:opacity-80 ${colorClass}`}
                          >
                            {ev.customerName}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Event popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className={`p-5 flex items-start justify-between ${STATUS_COLORS[popup.status].split(' ').slice(0, 1).join(' ')}`}>
              <div>
                <p className="font-bold text-gray-900">{popup.customerName}</p>
                <p className="text-sm text-gray-600">{popup.id}</p>
              </div>
              <button onClick={() => setPopup(null)} className="w-8 h-8 bg-white/70 rounded-xl flex items-center justify-center hover:bg-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'วันที่', value: new Date(popup.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { label: 'ช่วงเวลา', value: popup.timeSlot },
                { label: 'จำนวนโต๊ะ', value: `${popup.tables} โต๊ะ` },
                { label: 'แพ็กเกจ', value: popup.packageName },
                { label: 'สถานที่', value: popup.location },
                { label: 'ราคารวม', value: `฿${popup.totalPrice.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-2.5">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800 text-right ml-4">{value}</span>
                </div>
              ))}
              <div className="pt-1">
                <p className="text-xs text-gray-400 mb-2">สถานะ</p>
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${STATUS_COLORS[popup.status]}`}>
                  {popup.status === 'confirmed' ? 'ยืนยันแล้ว' :
                   popup.status === 'pending' ? 'รอยืนยัน' : 'เสร็จสิ้น'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
