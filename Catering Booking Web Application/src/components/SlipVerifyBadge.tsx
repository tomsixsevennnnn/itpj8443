import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react'
import type { Booking } from '../types'

interface SlipVerifyBadgeProps {
  status?: Booking['paymentSlipVerifyStatus']
  message?: string
}

/** ผลตรวจสอบสลิปอัตโนมัติผ่าน SlipOK (ดู backend/src/slip-verify) — undefined = ร้านยังไม่ได้ตั้งค่า SlipOK
 *  หรือยังไม่มีสลิป ไม่ต้องโชว์อะไรเลยในกรณีนั้น (ไม่ใช่การเตือนว่ามีปัญหา) */
const STATUS_CONFIG: Record<
  NonNullable<Booking['paymentSlipVerifyStatus']>,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  VERIFIED: { icon: CheckCircle2, className: 'text-green-700 bg-green-50 border-green-100', label: 'ตรวจสอบแล้ว — เป็นรายการโอนจริงกับธนาคาร' },
  DUPLICATE: { icon: XCircle, className: 'text-red-700 bg-red-50 border-red-100', label: 'สลิปซ้ำ — เคยถูกส่งเข้าระบบมาก่อนแล้ว' },
  AMOUNT_MISMATCH: { icon: AlertTriangle, className: 'text-red-700 bg-red-50 border-red-100', label: 'ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ' },
  ACCOUNT_MISMATCH: { icon: AlertTriangle, className: 'text-red-700 bg-red-50 border-red-100', label: 'บัญชีผู้รับในสลิปไม่ตรงกับบัญชีร้าน' },
  REJECTED: { icon: XCircle, className: 'text-red-700 bg-red-50 border-red-100', label: 'สลิปนี้ตรวจสอบไม่ผ่าน' },
  UNAVAILABLE: { icon: HelpCircle, className: 'text-gray-600 bg-gray-50 border-gray-200', label: 'ยังไม่ได้ตรวจสอบอัตโนมัติ (ระบบ SlipOK ขัดข้องชั่วคราว)' },
}

export default function SlipVerifyBadge({ status, message }: SlipVerifyBadgeProps) {
  if (!status) return null
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <div className={`flex items-start gap-1.5 text-[11px] border rounded-lg px-2.5 py-1.5 ${cfg.className}`}>
      <Icon size={13} className="shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">{cfg.label}</p>
        {message && <p className="opacity-80 mt-0.5">{message}</p>}
      </div>
    </div>
  )
}
