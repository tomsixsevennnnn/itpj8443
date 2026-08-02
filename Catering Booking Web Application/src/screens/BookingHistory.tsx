import { useRef, useState } from 'react'
import { Calendar, Check, Eye, FileText, Filter, Loader2, Printer, Search, Send, Upload, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import BookingDocument from '../components/BookingDocument'
import type { Booking, Screen, UserProfile } from '../types'
import { DOC_LABEL, docNumber, type DocType } from '../documents'
import { pickImageAsDataUrl } from '../imageUpload'

interface BookingHistoryProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  bookings: Booking[]
  onUpdateBooking: (id: string, patch: Partial<Booking>) => void
}

const STATUS_CONFIG = {
  pending: { label: 'รอยืนยัน', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  completed: { label: 'เสร็จสิ้น', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  cancelled: { label: 'ยกเลิก', bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400' },
}

export default function BookingHistory({ navigate, user, bookings, onUpdateBooking }: BookingHistoryProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [docView, setDocView] = useState<{ id: string; type: DocType } | null>(null)
  const [uploadingSlip, setUploadingSlip] = useState(false)
  const [slipError, setSlipError] = useState<string | null>(null)
  const [slipSent, setSlipSent] = useState(false)
  /** รูปที่เลือกไว้แต่ยังไม่ได้กดส่ง — ผูกกับ bookingId เพื่อกันเผลอโชว์ข้ามรายการ */
  const [slipDraft, setSlipDraft] = useState<{ id: string; dataUrl: string } | null>(null)
  const slipInputRef = useRef<HTMLInputElement>(null)

  const allBookings = bookings

  const openDetail = (id: string) => {
    setDetailId(id)
    setSlipDraft(null)
    setSlipError(null)
    setSlipSent(false)
  }

  const closeDetail = () => {
    setDetailId(null)
    setSlipDraft(null)
    setSlipError(null)
    setSlipSent(false)
  }

  /** เลือกรูปสลิป — ย่อขนาดแล้วพักไว้เป็นตัวอย่าง ยังไม่บันทึกจนกว่าจะกด "ส่ง" */
  const handlePickSlip = async (bookingId: string, file: File | undefined) => {
    if (!file) return
    setUploadingSlip(true)
    setSlipError(null)
    setSlipSent(false)
    try {
      const dataUrl = await pickImageAsDataUrl(file)
      setSlipDraft({ id: bookingId, dataUrl })
    } catch (err) {
      setSlipError(err instanceof Error ? err.message : 'อัปโหลดสลิปไม่สำเร็จ')
    } finally {
      setUploadingSlip(false)
      if (slipInputRef.current) slipInputRef.current.value = ''
    }
  }

  /** กดส่งจริง — ค่อยบันทึกสลิปเข้าใบจองให้ร้านเห็น */
  const submitSlip = () => {
    if (!slipDraft) return
    onUpdateBooking(slipDraft.id, { paymentSlip: slipDraft.dataUrl, paymentSlipUploadedAt: new Date().toISOString() })
    setSlipDraft(null)
    setSlipSent(true)
  }

  const filtered = allBookings.filter(b => {
    const matchSearch = b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName.includes(search) || search === ''
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const detailBooking = allBookings.find(b => b.id === detailId)
  const docBooking = docView ? allBookings.find(b => b.id === docView.id) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar navigate={navigate} currentScreen="history" user={user} />

      <div className="pt-24 pb-12 max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={24} className="text-orange-500" />
            ประวัติการจอง
          </h1>
          <p className="text-gray-500 text-sm mt-1">รายการจองทั้งหมดของคุณ</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่จอง หรือชื่อ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <div className="flex gap-1">
                {['all', 'pending', 'confirmed', 'completed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-xs px-3 py-2 rounded-xl transition-colors font-medium ${
                      statusFilter === s
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s === 'all' ? 'ทั้งหมด' :
                     s === 'pending' ? 'รอยืนยัน' :
                     s === 'confirmed' ? 'ยืนยันแล้ว' : 'เสร็จสิ้น'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['เลขที่จอง', 'วันที่จัดงาน', 'ช่วงเวลา', 'โต๊ะ', 'แพ็กเกจ', 'ราคารวม', 'สถานะ', 'จัดการ'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((booking) => {
                  const sc = STATUS_CONFIG[booking.status]
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{booking.id}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {new Date(booking.date + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{booking.timeSlot}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{booking.tables} โต๊ะ</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{booking.packageName}</td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-orange-600">{booking.totalPrice.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-0.5">฿</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openDetail(booking.id)}
                            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-600 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Eye size={12} />
                            ดู
                          </button>
                          <button
                            onClick={() => setDocView({ id: booking.id, type: 'quotation' })}
                            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <FileText size={12} />
                            ใบเสนอ
                          </button>
                          <button
                            onClick={() => setDocView({ id: booking.id, type: 'booking' })}
                            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-green-50 hover:text-green-600 text-gray-600 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <FileText size={12} />
                            ใบจอง
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((booking) => {
              const sc = STATUS_CONFIG[booking.status]
              return (
                <div key={booking.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{booking.id}</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    {new Date(booking.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">{booking.timeSlot} · {booking.tables} โต๊ะ · {booking.packageName}</p>
                  <p className="text-lg font-bold text-orange-600">{booking.totalPrice.toLocaleString()} ฿</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => openDetail(booking.id)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">รายละเอียด</button>
                    <button
                      onClick={() => setDocView({ id: booking.id, type: 'quotation' })}
                      className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg"
                    >
                      ใบเสนอราคา
                    </button>
                    <button
                      onClick={() => setDocView({ id: booking.id, type: 'booking' })}
                      className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg"
                    >
                      ใบจอง
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p>ไม่พบรายการจอง</p>
            </div>
          )}
        </div>
      </div>

      {/* Document viewer — ใบเสนอราคา / ใบจอง */}
      {docBooking && docView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto overflow-hidden print-area">
            {/* Toolbar */}
            <div className="no-print flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-100 sticky top-0">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{DOC_LABEL[docView.type]}</p>
                <p className="text-xs text-gray-400 font-mono">{docNumber(docBooking, docView.type)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* สลับดูอีกฉบับของงานเดียวกัน */}
                <div className="hidden sm:flex bg-gray-200 rounded-lg p-0.5">
                  {(['quotation', 'booking'] as DocType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setDocView({ id: docBooking.id, type: t })}
                      className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                        docView.type === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {DOC_LABEL[t]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-medium transition-colors"
                >
                  <Printer size={13} />
                  พิมพ์ / บันทึก PDF
                </button>
                <button
                  onClick={() => setDocView(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-[80vh] overflow-y-auto">
              <BookingDocument booking={docBooking} type={docView.type} />
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 flex items-center justify-between sticky top-0">
              <div>
                <h3 className="text-lg font-bold text-white">รายละเอียดการจอง</h3>
                <p className="text-orange-100 text-sm">{detailBooking.id}</p>
              </div>
              <button
                onClick={closeDetail}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'ชื่อลูกค้า', value: detailBooking.customerName },
                { label: 'วันที่', value: new Date(detailBooking.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { label: 'ช่วงเวลา', value: detailBooking.timeSlot },
                { label: 'จำนวนโต๊ะ', value: `${detailBooking.tables} โต๊ะ` },
                { label: 'จำนวนคนที่ร่วมงาน', value: `${detailBooking.guestCount ?? detailBooking.tables * 10} คน` },
                { label: 'แพ็กเกจ', value: detailBooking.packageName },
                { label: 'สถานที่', value: detailBooking.location },
                { label: 'เบอร์โทร', value: detailBooking.phone },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="font-medium text-gray-800 text-right ml-4">{value}</span>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-400 mb-2">รายการอาหาร</p>
                <div className="flex flex-wrap gap-1.5">
                  {detailBooking.menus.map(m => (
                    <span key={m} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{m}</span>
                  ))}
                </div>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between">
                <span className="font-bold text-gray-800">ราคารวม</span>
                <span className="text-xl font-bold text-orange-600">{detailBooking.totalPrice.toLocaleString()} ฿</span>
              </div>

              {/* สลิปโอนเงินมัดจำ — ร้านจะตรวจสอบกับบัญชีเองแล้วเปลี่ยนสถานะให้ */}
              <div>
                <p className="text-xs text-gray-400 mb-2">สลิปโอนเงินมัดจำ</p>
                <input
                  ref={slipInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => handlePickSlip(detailBooking.id, e.target.files?.[0])}
                  className="hidden"
                />

                {slipDraft?.id === detailBooking.id ? (
                  // เลือกรูปไว้แล้วแต่ยังไม่ได้กดส่ง
                  <div className="space-y-2">
                    <img
                      src={slipDraft.dataUrl}
                      alt="ตัวอย่างสลิปที่เลือก"
                      className="w-full max-h-64 object-contain rounded-xl border-2 border-dashed border-orange-300 bg-gray-50"
                    />
                    <p className="text-[11px] text-orange-600">ยังไม่ได้ส่ง — กด "ส่งสลิป" เพื่อแจ้งร้าน</p>
                    <div className="flex gap-2">
                      <button
                        onClick={submitSlip}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-xs font-semibold transition-colors"
                      >
                        <Send size={12} />
                        ส่งสลิป
                      </button>
                      <button
                        onClick={() => slipInputRef.current?.click()}
                        disabled={uploadingSlip}
                        className="px-3 text-xs text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
                      >
                        เลือกรูปใหม่
                      </button>
                    </div>
                  </div>
                ) : detailBooking.paymentSlip ? (
                  <div className="space-y-2">
                    <img
                      src={detailBooking.paymentSlip}
                      alt="สลิปโอนเงิน"
                      className="w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50"
                    />
                    {detailBooking.paymentSlipUploadedAt && (
                      <p className="text-[11px] text-gray-400">
                        {slipSent ? (
                          <span className="text-green-600 font-medium inline-flex items-center gap-1">
                            <Check size={11} />
                            ส่งสลิปแล้ว
                          </span>
                        ) : (
                          'แนบเมื่อ'
                        )}{' '}
                        {new Date(detailBooking.paymentSlipUploadedAt).toLocaleString('th-TH', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                        {' · '}รอร้านตรวจสอบกับบัญชี
                      </p>
                    )}
                    <button
                      onClick={() => slipInputRef.current?.click()}
                      disabled={uploadingSlip}
                      className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                    >
                      {uploadingSlip ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      แนบสลิปใหม่
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => slipInputRef.current?.click()}
                    disabled={uploadingSlip}
                    className="w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 rounded-xl py-6 text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-50"
                  >
                    {uploadingSlip ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    <span className="text-xs font-medium">
                      {uploadingSlip ? 'กำลังอัปโหลด...' : 'แนบสลิปโอนเงินมัดจำ'}
                    </span>
                  </button>
                )}
                {slipError && <p className="text-[11px] text-red-500 mt-1.5">{slipError}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
