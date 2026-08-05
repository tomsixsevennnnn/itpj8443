import { useState } from 'react'
import { Check, MapPin, Minus, Navigation, Plus, RotateCcw, Save, Search, Users, X } from 'lucide-react'
import LocationMap from '../../components/LocationMap'
import type { AppSettings, Booking, MenuItem, StaffPlan } from '../../types'
import { STAFF_ROLES, calculateStaff, isSamePlan, sumStaff, toPlan } from '../../staffing'
import { bookingCostSummary } from '../../costing'

const STATUS_CONFIG = {
  pending: { label: 'รอยืนยัน', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  completed: { label: 'เสร็จสิ้น', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  cancelled: { label: 'ยกเลิก', bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400' },
}

interface OrdersProps {
  bookings: Booking[]
  menus: MenuItem[]
  settings: AppSettings
  onUpdateBooking: (id: string, patch: Partial<Booking>) => void
}

export default function Orders({ bookings, menus, settings, onUpdateBooking }: OrdersProps) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [staffDraft, setStaffDraft] = useState<StaffPlan | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [slipZoom, setSlipZoom] = useState<string | null>(null)

  // อ่านจาก bookings ตรง ๆ เพื่อให้แผงขวาอัปเดตตามทันทีที่ข้อมูลเปลี่ยน
  const selected = selectedId ? bookings.find(b => b.id === selectedId) ?? null : null

  const filtered = bookings.filter(b =>
    b.customerName.includes(search) || b.id.includes(search) || search === ''
  )

  const updateStatus = (id: string, status: Booking['status']) => {
    onUpdateBooking(id, { status })
  }

  /* --- แผนกำลังคน ------------------------------------------------- */

  /** จำนวนพนักงานรวมของงาน (ใช้ตัวที่ปรับแก้ไว้ ถ้ายังไม่ปรับใช้ผลที่ระบบคำนวณ) */
  const staffTotalOf = (b: Booking) => sumStaff(b.staffActual ?? toPlan(calculateStaff(b.tables)))

  const openBooking = (booking: Booking) => {
    setSelectedId(booking.id)
    setStaffDraft(booking.staffActual ?? toPlan(calculateStaff(booking.tables)))
    setNoteDraft(booking.staffNote ?? '')
  }

  const adjustStaff = (key: keyof StaffPlan, delta: number) => {
    setStaffDraft(prev => (prev ? { ...prev, [key]: Math.max(0, prev[key] + delta) } : prev))
  }

  /** คำนวณใหม่จากจำนวนโต๊ะปัจจุบัน (ล้างค่าที่ปรับแก้ไว้) */
  const recalcStaff = () => {
    if (selected) setStaffDraft(toPlan(calculateStaff(selected.tables)))
  }

  /** บันทึกทั้งจำนวนที่ระบบคำนวณและจำนวนที่ปรับแก้จริง ไว้อ้างอิงภายหลัง */
  const saveStaff = () => {
    if (!selected || !staffDraft) return
    onUpdateBooking(selected.id, {
      staffAuto: toPlan(calculateStaff(selected.tables)),
      staffActual: staffDraft,
      staffNote: noteDraft.trim(),
      staffSavedAt: new Date().toISOString(),
    })
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
        <div className={`flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto transition-all ${selected ? 'hidden lg:block' : ''}`}>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['ชื่อลูกค้า', 'วันที่', 'ช่วงเวลา', 'โต๊ะ', 'พนักงาน', 'แพ็กเกจ', 'ราคารวม', 'สถานะ', ''].map(col => (
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
                    onClick={() => openBooking(booking)}
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
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <Users size={13} className="text-gray-400" />
                        {staffTotalOf(booking)}
                      </span>
                      {booking.staffActual && (
                        <span className="block text-[10px] text-blue-500 leading-tight">ปรับแก้แล้ว</span>
                      )}
                    </td>
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
          <div className="w-full lg:w-96 lg:flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Drawer header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 flex items-start justify-between">
              <div>
                <p className="font-bold text-white text-lg">{selected.customerName}</p>
                <p className="text-orange-100 text-xs">{selected.id}</p>
              </div>
              <button
                onClick={() => setSelectedId(null)}
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
                    { label: 'จำนวนคนที่ร่วมงาน', value: `${selected.guestCount ?? selected.tables * 10} คน` },
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
                {/* รายละเอียดการเข้าถึง + พิกัดจริงจากแผนที่ */}
                {selected.locationDetail && (
                  <>
                    {selected.locationDetail.detail.accessNote && (
                      <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-[10px] text-amber-600 mb-0.5">การเข้าถึงสถานที่</p>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          {selected.locationDetail.detail.accessNote}
                        </p>
                      </div>
                    )}

                    <LocationMap
                      key={selected.id}
                      position={{ lat: selected.locationDetail.lat, lng: selected.locationDetail.lng }}
                      interactive={false}
                      className="mt-2 h-28 rounded-xl overflow-hidden"
                    />

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-mono text-gray-500">
                        {selected.locationDetail.lat.toFixed(6)}, {selected.locationDetail.lng.toFixed(6)}
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selected.locationDetail.lat},${selected.locationDetail.lng}`}
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

              {/* Menu list */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">รายการอาหาร</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.menus.map(m => (
                    <span key={m} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-full">{m}</span>
                  ))}
                </div>
              </div>

              {/* Staff plan */}
              {staffDraft && (() => {
                const calc = calculateStaff(selected.tables)
                const autoPlan = toPlan(calc)
                const draftTotal = sumStaff(staffDraft)
                const adjusted = !isSamePlan(staffDraft, autoPlan)
                const savedPlan = selected.staffActual
                const dirty =
                  !savedPlan ||
                  !isSamePlan(savedPlan, staffDraft) ||
                  (selected.staffNote ?? '') !== noteDraft.trim()

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">แผนกำลังคน</p>
                      <button
                        onClick={recalcStaff}
                        className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-orange-600 transition-colors"
                      >
                        <RotateCcw size={11} />
                        คำนวณใหม่
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-400 mb-2.5">
                      คำนวณอัตโนมัติจาก {selected.tables} โต๊ะ · ปรับแก้ได้ก่อนบันทึก
                    </p>

                    <div className="space-y-2">
                      {STAFF_ROLES.map(role => {
                        const value = staffDraft[role.key]
                        const auto = autoPlan[role.key]
                        return (
                          <div key={role.key} className="flex items-center gap-2.5 bg-gray-50 rounded-xl p-2.5">
                            <span className="text-base leading-none">{role.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 leading-tight">{role.label}</p>
                              <p className="text-[10px] text-gray-400 leading-tight">{role.rule}</p>
                              {value !== auto && (
                                <p className="text-[10px] text-blue-500 leading-tight mt-0.5">
                                  ระบบคำนวณ {auto} คน
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => adjustStaff(role.key, -1)}
                                disabled={value === 0}
                                className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="w-7 text-center text-sm font-bold text-gray-900">{value}</span>
                              <button
                                onClick={() => adjustStaff(role.key, 1)}
                                className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:border-orange-300 hover:text-orange-600 transition-colors"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* รวมทั้งหมด */}
                    <div className="mt-2.5 bg-gray-900 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-orange-400" />
                        <span className="text-sm font-semibold text-white">พนักงานรวมทั้งหมด</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white leading-none">{draftTotal} คน</p>
                        {adjusted && (
                          <p className="text-[10px] text-gray-400 mt-1">ระบบคำนวณ {calc.total} คน</p>
                        )}
                      </div>
                    </div>

                    {/* หมายเหตุ */}
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                        หมายเหตุ
                      </label>
                      <textarea
                        value={noteDraft}
                        onChange={e => setNoteDraft(e.target.value)}
                        rows={2}
                        placeholder="เช่น งาน VIP, งานนอกสถานที่, ข้อกำหนดพิเศษของลูกค้า"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-300"
                      />
                    </div>

                    <button
                      onClick={saveStaff}
                      disabled={!dirty}
                      className="w-full mt-2 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
                    >
                      <Save size={14} />
                      {dirty ? 'บันทึกแผนกำลังคน' : 'บันทึกแล้ว'}
                    </button>

                    {selected.staffSavedAt && (
                      <p className="text-[10px] text-gray-400 text-center mt-1.5">
                        บันทึกล่าสุด{' '}
                        {new Date(selected.staffSavedAt).toLocaleString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {selected.staffAuto && selected.staffActual && !isSamePlan(selected.staffAuto, selected.staffActual) && (
                          <> · ปรับจาก {sumStaff(selected.staffAuto)} เป็น {sumStaff(selected.staffActual)} คน</>
                        )}
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Price */}
              <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
                <span className="font-bold text-gray-800">ราคารวม</span>
                <span className="text-xl font-bold text-orange-600">฿{selected.totalPrice.toLocaleString()}</span>
              </div>

              {/* ต้นทุน + กำไรของงานนี้ */}
              {(() => {
                const cost = bookingCostSummary(selected, menus, settings)
                return (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">ต้นทุน / กำไรของงานนี้</p>
                    <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>ต้นทุนวัตถุดิบ (เมนู)</span>
                        <span className="font-medium">฿{cost.menuCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>ค่าแรงคน</span>
                        <span className="font-medium">฿{cost.wageCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-800 font-semibold pt-1.5 border-t border-gray-200">
                        <span>ต้นทุนรวม</span>
                        <span>฿{cost.totalCost.toLocaleString()}</span>
                      </div>
                      <div className={`flex justify-between font-bold pt-1.5 border-t border-gray-200 ${cost.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        <span>กำไร</span>
                        <span>฿{cost.profit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* สลิปโอนเงินมัดจำ — ตรวจสอบกับบัญชีร้านเองก่อนเปลี่ยนสถานะ */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">สลิปโอนเงินมัดจำ</p>
                {selected.paymentSlip ? (
                  <div className="space-y-2">
                    <button type="button" onClick={() => setSlipZoom(selected.paymentSlip!)} className="block w-full">
                      <img
                        src={selected.paymentSlip}
                        alt="สลิปโอนเงิน"
                        className="w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50 hover:opacity-90 transition-opacity cursor-zoom-in"
                      />
                    </button>
                    {selected.paymentSlipUploadedAt && (
                      <p className="text-[11px] text-gray-400">
                        ลูกค้าแนบเมื่อ{' '}
                        {new Date(selected.paymentSlipUploadedAt).toLocaleString('th-TH', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                    <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                      ตรวจสอบยอดเงินเข้าบัญชีร้านให้ตรงกับสลิปก่อนกดเปลี่ยนสถานะเป็น "ยืนยันแล้ว"
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">ลูกค้ายังไม่ได้แนบสลิป</p>
                )}
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

      {/* Lightbox ดูสลิปแบบเต็มขนาด */}
      {slipZoom && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSlipZoom(null)}
        >
          <button
            onClick={() => setSlipZoom(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <X size={18} />
          </button>
          <img
            src={slipZoom}
            alt="สลิปโอนเงิน (ขยาย)"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
