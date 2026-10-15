import { Check, Loader2 } from 'lucide-react'
import { PHASE_INFO, bookingPhase, canQuickConfirm, ownerNextStep, phaseNote } from '../bookingPhase'
import type { Booking } from '../types'

interface BookingPhaseBannerProps {
  booking: Pick<Booking, 'status' | 'paymentSlip' | 'paymentSlipUploadedAt' | 'paymentSlipVerifyStatus' | 'paymentSlipVerifyMessage'>
  /** กดยืนยันใบจองลัด (เปลี่ยนสถานะเป็น "ยืนยันแล้ว") — แสดงปุ่มเฉพาะขั้น "รอร้านยืนยัน" */
  onConfirm: () => void
  /** กำลังเปลี่ยนสถานะอยู่ (ใบนี้หรือใบอื่น) — ล็อกปุ่ม */
  busy: boolean
  /** กำลังเปลี่ยนเป็น "ยืนยันแล้ว" ของใบนี้ — โชว์ spinner บนปุ่ม */
  confirming: boolean
}

/**
 * กล่องบอกเจ้าของร้านว่าใบจองอยู่ขั้นไหน (ป้ายเดียวกับในรายการ) ต้องทำอะไรต่อ และมีปุ่มลัด "ยืนยันใบจอง" เมื่อรอร้านยืนยัน
 * วางเหนือปุ่ม "อัปเดตสถานะ" ทั้งหน้ารายการจองและปฏิทิน — ปุ่มสถานะจริงด้านล่างยังอยู่ครบเหมือนเดิม
 */
export default function BookingPhaseBanner({ booking, onConfirm, busy, confirming }: Readonly<BookingPhaseBannerProps>) {
  const phase = bookingPhase(booking)
  const info = PHASE_INFO[phase]
  const note = phaseNote(booking)
  const showVerifyMessage = !!note && !!booking.paymentSlipVerifyMessage

  return (
    <div className={`mb-3 rounded-xl border p-3 ${info.bg} ${info.border}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${info.text}`}>
          <span className={`h-2 w-2 rounded-full ${info.dot}`} />
          {info.label}
        </span>
        {note && <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-red-600">{note}</span>}
      </div>
      <p className={`mt-1.5 text-xs leading-relaxed ${info.text}`}>{ownerNextStep(booking)}</p>
      {showVerifyMessage && <p className="mt-1 text-[11px] leading-relaxed text-gray-500">ผลตรวจ: {booking.paymentSlipVerifyMessage}</p>}
      {canQuickConfirm(booking) && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-wait disabled:opacity-60"
        >
          {confirming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {confirming ? 'กำลังยืนยัน...' : 'ยืนยันใบจอง'}
        </button>
      )}
    </div>
  )
}
