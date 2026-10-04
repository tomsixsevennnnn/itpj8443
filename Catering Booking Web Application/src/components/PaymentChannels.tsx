import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { ShopInfo } from '../types'
import { bankAccountsOf, bankChannelKey, promptPayChannelKey, promptPaysOf } from '../paymentChannels'
import BankBadge from './BankBadge'
import PromptPayQr from './PromptPayQr'

interface PaymentChannelsProps {
  shopInfo: ShopInfo
  /** ยอดมัดจำที่ฝังใน QR พร้อมเพย์ทุกใบ */
  depositAmount: number
  /** document = ใบเสนอราคา/ใบจอง (แสดงทุกช่องทางพร้อมกัน ขนาดกะทัดรัด ไม่ต้องเลือก) history = หน้าโอนมัดจำของลูกค้า (เลือกช่องทางที่โอนได้) */
  variant: 'document' | 'history'
  /** เฉพาะ variant history: ช่องทางที่ลูกค้าเลือกอยู่ (key) และ callback ตอนเลือก — ไม่ส่ง onSelect = ไม่แสดงตัวเลือก (เช่นร้านมีช่องทางเดียว) */
  selectedKey?: string | null
  onSelect?: (key: string) => void
}

/**
 * ช่องทางโอนเงินของร้านที่ลูกค้าเห็น — รองรับทุกกรณีที่ร้านผูกใน SlipOK: หลายบัญชีธนาคาร (ธนาคารเดียวกันคนละชื่อ/คนละเลข หรือคนละธนาคาร)
 * และพร้อมเพย์หลายรายการ ลูกค้า "เลือกช่องทางที่จะโอน" ได้ในหน้าโอนมัดจำ (ระบบจดไว้ที่ใบจองและเทียบกับผู้รับในสลิปตอนแนบ)
 * ไม่มีช่องทางเลย = ไม่แสดงอะไร ผู้เรียกจัดการข้อความแจ้งเอง
 */
export default function PaymentChannels({ shopInfo, depositAmount, variant, selectedKey, onSelect }: Readonly<PaymentChannelsProps>) {
  const banks = bankAccountsOf(shopInfo)
  const promptPays = promptPaysOf(shopInfo)
  const isHistory = variant === 'history'
  if (banks.length === 0 && promptPays.length === 0) return null

  /** ห่อการ์ดช่องทางให้กดเลือกได้ (เฉพาะหน้าโอนมัดจำ และเมื่อมีช่องทางให้เลือก) — ไม่มี key (เลขสั้นเกิน) หรือไม่ใช่โหมดเลือก = แสดงเฉยๆ */
  const wrap = (key: string | null, content: ReactNode, className: string) => {
    if (!isHistory || !onSelect || !key) return <div className={className}>{content}</div>
    const selected = selectedKey === key
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onSelect(key)}
        className={`relative text-left transition-all ${className} rounded-xl border-2 p-3 ${
          selected ? 'border-orange-500 bg-orange-50/60 shadow-sm' : 'border-gray-200 bg-white hover:border-orange-300'
        }`}
      >
        <span
          className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
            selected ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-transparent'
          }`}
        >
          <Check size={12} />
        </span>
        {content}
      </button>
    )
  }

  return (
    <div>
      {isHistory && onSelect && (
        <p className="mb-2 text-xs text-gray-500">เลือกช่องทางที่คุณจะโอน แล้วโอนตามยอดมัดจำ จากนั้นแนบสลิป</p>
      )}
      <div role={isHistory && onSelect ? 'radiogroup' : undefined} className="flex flex-wrap items-stretch gap-3">
        {banks.map((b, i) => (
          <div key={`bank-${b.accountNumber}-${i}`} className="contents">
            {wrap(
              bankChannelKey(b.accountNumber),
              <div className="space-y-1 pr-6">
                {b.bankName && (
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <BankBadge bank={b.bankName} size={isHistory ? 22 : 20} />
                    {b.bankName}
                  </p>
                )}
                <p className={`font-mono font-bold leading-tight tracking-wider text-gray-900 ${isHistory ? 'text-2xl' : 'text-xl'}`}>
                  {b.accountNumber}
                </p>
                {b.accountName && <p className="text-sm text-gray-600">{b.accountName}</p>}
              </div>,
              `min-w-[180px] flex-1 ${isHistory ? '' : 'space-y-1'}`,
            )}
          </div>
        ))}

        {/* ฝังยอดมัดจำใน QR ทุกใบ — ยอดที่ต้องโอนคือมัดจำเสมอ (ส่วนที่เหลือจ่ายวันงานจริง) */}
        {promptPays.map((p, i) => (
          <div key={`pp-${p.id}-${i}`} className="contents">
            {wrap(
              promptPayChannelKey(p.id),
              <div className={isHistory ? 'flex items-center gap-3 pr-6' : 'text-center'}>
                <PromptPayQr
                  promptPayId={p.id}
                  amount={depositAmount}
                  className={`flex-shrink-0 rounded-lg border border-gray-200 bg-white ${isHistory ? 'h-32 w-32' : 'h-28 w-28'}`}
                />
                <div className={isHistory ? 'space-y-1 text-left' : 'mt-1'}>
                  {(p.firstName || p.lastName) && (
                    <p className={isHistory ? 'text-lg font-bold leading-tight text-gray-900' : 'text-xs text-gray-600'}>
                      {p.firstName} {p.lastName}
                    </p>
                  )}
                  {isHistory && <p className="text-xs text-gray-400">สแกนแล้วยอดขึ้นอัตโนมัติ</p>}
                </div>
              </div>,
              isHistory ? '' : 'flex-shrink-0',
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
