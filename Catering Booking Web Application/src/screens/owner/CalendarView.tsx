import { useEffect, useState } from 'react'
import { ArrowLeft, Calendar, Check, ChevronLeft, ChevronRight, MapPin, Navigation, Users, X } from 'lucide-react'
import LocationMap from '../../components/LocationMap'
import ImageLightbox from '../../components/ImageLightbox'
import type { Booking } from '../../types'
import { docNumber } from '../../documents'
import {
  BASE_SLOTS,
  BOOKING_STATUS_INFO,
  DAY_STATUS_INFO,
  SLOT_CAPACITY,
  TIME_SLOTS,
  bookingsOn,
  dayStatus,
  slotIdOf,
  slotUsage,
  toDateKey,
} from '../../availability'

interface CalendarViewProps {
  bookings: Booking[]
  onUpdateBooking: (id: string, patch: Partial<Booking>) => void
}

const MONTHS_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]
const DAYS_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

const SLOT_LABEL = Object.fromEntries(TIME_SLOTS.map(s => [s.id, s.label])) as Record<string, string>

export default function CalendarView({ bookings, onUpdateBooking }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [popupId, setPopupId] = useState<string | null>(null)
  /** วันที่กำลังดูรายการงานทั้งหมด (มีมากกว่า 1 งาน) — null = ไม่ได้เปิดหน้ารายการวัน */
  const [dayPopupDate, setDayPopupDate] = useState<string | null>(null)
  const [slipZoom, setSlipZoom] = useState<string | null>(null)

  const popup = popupId ? bookings.find(b => b.id === popupId) ?? null : null
  const dayEvents = dayPopupDate ? bookingsOn(bookings, dayPopupDate) : []

  /** กด Esc ปิด popup ที่เปิดอยู่ล่างขึ้นบน: ดูสลิป → รายละเอียดงาน → รายการวัน */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (slipZoom) setSlipZoom(null)
      else if (popupId) setPopupId(null)
      else if (dayPopupDate) setDayPopupDate(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [slipZoom, popupId, dayPopupDate])

  /** กดที่ตัววันในปฏิทิน — งานเดียวเปิดรายละเอียดตรงๆ หลายงานเปิดรายการให้เลือกก่อน */
  const openDay = (dateKey: string, events: Booking[]) => {
    if (events.length === 0) return
    if (events.length === 1) setPopupId(events[0].id)
    else setDayPopupDate(dateKey)
  }

  /** ปิดรายละเอียดงาน — ถ้าเปิดมาจากรายการวัน ให้กลับไปที่รายการ ไม่ใช่ปิดทั้งหมด */
  const closeDetail = () => setPopupId(null)

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  /* สรุปทั้งเดือน */
  const monthBookings = bookings.filter(b => {
    const [y, m] = b.date.split('-').map(Number)
    return y === year && m === month + 1
  })
  const countBy = (s: Booking['status']) => monthBookings.filter(b => b.status === s).length
  const monthTables = monthBookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.tables, 0)
  const monthRevenue = monthBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.totalPrice, 0)

  return (
    <div>
      {/* สรุปเดือนนี้ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'งานทั้งเดือน', value: `${monthBookings.length} งาน`, tone: 'text-gray-900' },
          { label: 'รอยืนยัน', value: `${countBy('pending')} งาน`, tone: 'text-yellow-600' },
          { label: 'ยืนยันแล้ว', value: `${countBy('confirmed')} งาน`, tone: 'text-green-600' },
          { label: 'โต๊ะรวม', value: `${monthTables} โต๊ะ`, tone: 'text-gray-900' },
          { label: 'ยอดรวม', value: `฿${monthRevenue.toLocaleString()}`, tone: 'text-orange-600' },
        ].map(({ label, value, tone }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-lg font-bold mt-0.5 ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* คำอธิบายสี */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <span className="text-xs font-semibold text-gray-400">สถานะงาน</span>
        {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${BOOKING_STATUS_INFO[s].dot}`} />
            <span className="text-sm text-gray-600">{BOOKING_STATUS_INFO[s].label}</span>
          </div>
        ))}
        <span className="text-xs font-semibold text-gray-400 ml-auto">คิวรับงาน</span>
        {(['available', 'full'] as const).map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-sm ${DAY_STATUS_INFO[s].dot}`} />
            <span className="text-sm text-gray-600">{DAY_STATUS_INFO[s].label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-gray-900 text-lg">{MONTHS_TH[month]} {year + 543}</h2>
            <button
              onClick={goToday}
              className="text-xs text-orange-600 hover:text-orange-700 border border-orange-200 hover:bg-orange-50 px-2.5 py-1 rounded-lg transition-colors"
            >
              วันนี้
            </button>
          </div>
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
            const dateKey = day ? toDateKey(year, month, day) : ''
            const events = day ? bookingsOn(bookings, dateKey) : []
            const status = day ? dayStatus(bookings, dateKey) : 'available'
            const usage = day ? slotUsage(bookings, dateKey) : null
            const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
            const dow = idx % 7

            return (
              <div
                key={idx}
                onClick={() => openDay(dateKey, events)}
                className={`min-h-[118px] p-2 border-b border-r border-gray-50 ${
                  !day ? 'bg-gray-50/50' : events.length > 0
                    ? 'hover:bg-orange-50/40 transition-colors cursor-pointer'
                    : 'hover:bg-orange-50/20 transition-colors'
                }`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${
                        isToday ? 'bg-orange-500 text-white' :
                        dow === 0 ? 'text-red-500' :
                        dow === 6 ? 'text-blue-500' : 'text-gray-700'
                      }`}>
                        {day}
                      </div>
                      {events.length > 0 && (
                        <span
                          className={`w-2.5 h-2.5 rounded-sm ${DAY_STATUS_INFO[status].dot}`}
                          title={`คิวรับงาน: ${DAY_STATUS_INFO[status].label}`}
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      {events.slice(0, 3).map(ev => {
                        const info = BOOKING_STATUS_INFO[ev.status]
                        return (
                          <button
                            key={ev.id}
                            onClick={e => {
                              e.stopPropagation()
                              setPopupId(ev.id)
                            }}
                            className={`w-full text-left text-[10px] font-medium px-1.5 py-1 rounded-lg border truncate transition-all hover:opacity-80 ${info.chip} ${info.border}`}
                            title={`${ev.customerName} · ${SLOT_LABEL[slotIdOf(ev.timeSlot)]} · ${ev.tables} โต๊ะ · ${info.label}`}
                          >
                            {ev.customerName} · {ev.tables} โต๊ะ
                          </button>
                        )
                      })}
                      {events.length > 3 && (
                        <p className="text-[10px] text-orange-600 font-medium pl-1.5 hover:underline">
                          + อีก {events.length - 3} งาน
                        </p>
                      )}
                      {usage && events.length > 0 && (
                        <p className="text-[9px] text-gray-400 pl-1.5">
                          จอง {BASE_SLOTS.reduce((max, s) => Math.max(max, usage[s]), 0)}/{SLOT_CAPACITY} โต๊ะ
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* รายการงานทั้งหมดในวันที่กด (วันที่มีมากกว่า 1 งาน) */}
      {dayPopupDate && !popup && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDayPopupDate(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 flex items-start justify-between bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-orange-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    {new Date(dayPopupDate + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500">{dayEvents.length} งาน</p>
                </div>
              </div>
              <button onClick={() => setDayPopupDate(null)} className="w-8 h-8 bg-white rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>

            <div className="p-3 space-y-1.5 max-h-[65vh] overflow-y-auto">
              {dayEvents.map(ev => {
                const info = BOOKING_STATUS_INFO[ev.status]
                return (
                  <button
                    key={ev.id}
                    onClick={() => setPopupId(ev.id)}
                    className={`w-full text-left px-3.5 py-3 rounded-2xl border transition-all hover:opacity-80 ${info.chip} ${info.border}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{ev.customerName}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70 flex-shrink-0">{info.label}</span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      {SLOT_LABEL[slotIdOf(ev.timeSlot)]} · {ev.tables} โต๊ะ · ฿{ev.totalPrice.toLocaleString()}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Event popup */}
      {popup && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeDetail}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`p-5 flex items-start justify-between ${BOOKING_STATUS_INFO[popup.status].chip}`}>
              <div className="flex items-center gap-2 min-w-0">
                {dayPopupDate && (
                  <button
                    onClick={closeDetail}
                    aria-label="กลับไปรายการวัน"
                    className="w-8 h-8 bg-white/70 rounded-xl flex items-center justify-center hover:bg-white transition-colors flex-shrink-0"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{popup.customerName}</p>
                  <p className="text-sm text-gray-600">{docNumber(popup, 'booking')}</p>
                </div>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 bg-white/70 rounded-xl flex items-center justify-center hover:bg-white transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {[
                { label: 'วันที่', value: new Date(popup.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { label: 'ช่วงเวลา', value: popup.timeSlot },
                { label: 'จำนวนโต๊ะ', value: `${popup.tables} โต๊ะ` },
                { label: 'ผู้ร่วมงาน', value: `${popup.guestCount ?? popup.tables * 10} คน` },
                { label: 'แพ็กเกจ', value: popup.packageName },
                { label: 'ราคารวม', value: `฿${popup.totalPrice.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4 text-sm border-b border-gray-50 pb-2.5">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="font-medium text-gray-800 text-right">{value}</span>
                </div>
              ))}

              {/* สถานที่ — มีพิกัดจริงก็โชว์แผนที่ย่อ + ปุ่มนำทางไปเลย */}
              <div className="pb-2.5 border-b border-gray-50">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="font-medium text-gray-800">{popup.location}</span>
                </div>
                {popup.locationDetail && (
                  <>
                    <LocationMap
                      key={popup.id}
                      position={{ lat: popup.locationDetail.lat, lng: popup.locationDetail.lng }}
                      interactive={false}
                      className="mt-2 h-28 rounded-xl overflow-hidden"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-mono text-gray-500">
                        {popup.locationDetail.lat.toFixed(6)}, {popup.locationDetail.lng.toFixed(6)}
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${popup.locationDetail.lat},${popup.locationDetail.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700"
                      >
                        <Navigation size={11} />
                        นำทาง
                      </a>
                    </div>
                  </>
                )}
              </div>

              {popup.staffActual && (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users size={13} />
                    แผนกำลังคน
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {popup.staffActual.servers + popup.staffActual.chefs + popup.staffActual.assistants + popup.staffActual.dishwashers} คน
                  </span>
                </div>
              )}

              {/* สลิปโอนเงินมัดจำ — ตรวจสอบกับบัญชีร้านเองก่อนเปลี่ยนสถานะ */}
              {popup.paymentSlip && (
                <button type="button" onClick={() => setSlipZoom(popup.paymentSlip!)} className="block w-full">
                  <img
                    src={popup.paymentSlip}
                    alt="สลิปโอนเงิน"
                    className="w-full max-h-48 object-contain rounded-xl border border-gray-200 bg-gray-50 hover:opacity-90 transition-opacity cursor-zoom-in"
                  />
                </button>
              )}

              {/* เปลี่ยนสถานะได้จากปฏิทินเลย */}
              <div>
                <p className="text-xs text-gray-400 mb-2">อัปเดตสถานะ</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map(s => {
                    const info = BOOKING_STATUS_INFO[s]
                    const isActive = popup.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => onUpdateBooking(popup.id, { status: s })}
                        className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                          isActive ? `${info.chip} ${info.border}` : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {isActive && <Check size={11} />}
                        {info.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox ดูสลิปแบบเต็มขนาด */}
      {slipZoom && (
        <ImageLightbox
          src={slipZoom}
          alt="สลิปโอนเงิน (ขยาย)"
          fileName={`สลิป-${popup ? docNumber(popup, 'booking') : 'booking'}.jpg`}
          onClose={() => setSlipZoom(null)}
        />
      )}
    </div>
  )
}
