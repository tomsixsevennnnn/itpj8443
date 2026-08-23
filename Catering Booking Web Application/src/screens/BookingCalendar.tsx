import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useNav } from '../NavContext'
import type { QueueBooking } from '../types'
import {
  DAY_STATUS_INFO,
  bookableSlots,
  dayStatus,
  toDateKey,
  type TimeSlotHours,
} from '../availability'

interface BookingCalendarProps {
  /** คิวรับงานของ "ทุกลูกค้า" (ไม่ใช่แค่ของตัวเอง) — ใช้เช็คว่าวันไหนเต็มแล้วบ้าง ดึงจาก /bookings/availability */
  bookings: QueueBooking[]
  onSelectDateTime: (date: string, timeSlot: string) => void
  /** เวลาของแต่ละช่วง — เจ้าของร้านแก้ไขได้จากหน้า "ตั้งค่า" (AppSettings.timeSlotHours) */
  slotHours: TimeSlotHours
  /** วันที่ร้านปิด ไม่รับจอง — เจ้าของร้านแก้ไขได้จากหน้า "ตั้งค่า" (AppSettings.closedDates) */
  closedDates: string[]
}

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

export default function BookingCalendar({ bookings, onSelectDateTime, slotHours, closedDates }: BookingCalendarProps) {
  const { navigate } = useNav()
  const slots = bookableSlots(slotHours)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const getAvail = (day: number) => dayStatus(bookings, toDateKey(viewYear, viewMonth, day), closedDates)

  const isPast = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    d.setHours(0, 0, 0, 0)
    const t = new Date(); t.setHours(0, 0, 0, 0)
    return d < t
  }

  const handleNext = () => {
    if (!selectedDate || !selectedSlot) return
    const slot = slots.find(s => s.id === selectedSlot)!
    onSelectDateTime(selectedDate, `${slot.label} (${slot.time})`)
    navigate('select-table')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentScreen="booking-calendar" />

      <div className="pt-24 pb-12 max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-orange-500 font-semibold text-sm mb-1">ขั้นตอนที่ 1</p>
          <h1 className="text-2xl font-bold text-gray-900">เลือกวันจัดงาน</h1>
          <p className="text-gray-500 text-sm mt-1">เลือกวันและช่วงเวลาที่ต้องการจัดงาน</p>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Calendar */}
          <div className="md:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <h2 className="font-bold text-gray-900 text-lg">
                {MONTHS_TH[viewMonth]} {viewYear + 543}
              </h2>
              <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_TH.map((d, i) => (
                <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} />
                const dateKey = toDateKey(viewYear, viewMonth, day)
                const past = isPast(day)
                const avail = getAvail(day)
                const isSelected = selectedDate === dateKey
                const dow = idx % 7
                const dotColor = past ? '' : DAY_STATUS_INFO[avail].dot

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (past || avail !== 'available') return
                      setSelectedDate(dateKey)
                      setSelectedSlot(null)
                    }}
                    disabled={past || avail !== 'available'}
                    title={avail === 'closed' ? 'ร้านปิดวันนี้' : undefined}
                    className={`relative flex flex-col items-center py-2 rounded-xl transition-all text-sm font-medium
                      ${past ? 'opacity-30 cursor-not-allowed text-gray-400' : ''}
                      ${!past && avail !== 'available' ? 'opacity-50 cursor-not-allowed text-gray-400' : ''}
                      ${isSelected ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : ''}
                      ${!isSelected && !past && avail === 'available' ? 'hover:bg-orange-50 hover:text-orange-600' : ''}
                      ${!isSelected && dow === 0 ? 'text-red-500' : ''}
                      ${!isSelected && dow === 6 ? 'text-blue-500' : ''}
                      ${!isSelected && !past && avail === 'available' && dow !== 0 && dow !== 6 ? 'text-gray-700' : ''}
                    `}
                  >
                    {day}
                    {dotColor && !isSelected && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 pt-5 border-t border-gray-100">
              {(['available', 'full', 'closed'] as const).map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${DAY_STATUS_INFO[s].dot}`} />
                  <span className="text-xs text-gray-500">{DAY_STATUS_INFO[s].label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-orange-500" />
                <h3 className="font-semibold text-gray-900">
                  {selectedDate ? 'เลือกช่วงเวลา' : 'กรุณาเลือกวันก่อน'}
                </h3>
              </div>

              {selectedDate && (
                <div className="mb-4 bg-orange-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-xs font-medium text-orange-700">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('th-TH', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                  <span
                    className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      DAY_STATUS_INFO[dayStatus(bookings, selectedDate, closedDates)].chip
                    }`}
                  >
                    {DAY_STATUS_INFO[dayStatus(bookings, selectedDate, closedDates)].label}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {slots.map((slot) => {
                  const disabled = !selectedDate
                  const isSlotSelected = selectedSlot === slot.id

                  return (
                    <button
                      key={slot.id}
                      disabled={disabled}
                      onClick={() => !disabled && setSelectedSlot(slot.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                        ${isSlotSelected ? 'border-orange-500 bg-orange-50' : ''}
                        ${!isSlotSelected && !disabled ? 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/50' : ''}
                        ${disabled ? 'border-gray-100 opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <span className="text-xl">{slot.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${isSlotSelected ? 'text-orange-700' : 'text-gray-800'}`}>
                          {slot.label}
                        </p>
                        <p className={`text-xs ${isSlotSelected ? 'text-orange-500' : 'text-gray-400'}`}>
                          {slot.time}
                        </p>
                      </div>
                      {isSlotSelected && (
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!selectedDate || !selectedSlot}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-4 font-semibold transition-all shadow-lg shadow-orange-200 disabled:shadow-none flex items-center justify-center gap-2"
            >
              ถัดไป
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
