import { Plus, Trash2 } from 'lucide-react'
import { THAI_BANK_NAMES } from '../banks'
import { MAX_EXTRA_PAYMENT_ACCOUNTS } from '../paymentChannels'
import type { BankAccount, PromptPayAccount } from '../types'
import BankBadge from './BankBadge'
import SuggestInput from './SuggestInput'

interface ExtraPaymentAccountsProps {
  extraBankAccounts: BankAccount[]
  extraPromptPays: PromptPayAccount[]
  onChange: (patch: { extraBankAccounts?: BankAccount[]; extraPromptPays?: PromptPayAccount[] }) => void
}

const INPUT =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all'

/**
 * บัญชีรับเงินเพิ่มเติมนอกจากบัญชีหลัก — SlipOK ผูกได้หลายบัญชีต่อสาขา (ธนาคารเดียวกันคนละชื่อ/คนละเลข หรือคนละธนาคาร) และพร้อมเพย์
 * หลายรายการ กรอกที่นี่ให้ตรงกับที่ผูกใน SlipOK แล้วลูกค้าจะเห็นทุกบัญชี และระบบเทียบผู้รับในสลิปกับบัญชีใดบัญชีหนึ่งในรายการ
 */
export default function ExtraPaymentAccounts({ extraBankAccounts, extraPromptPays, onChange }: Readonly<ExtraPaymentAccountsProps>) {
  const updateBank = (index: number, patch: Partial<BankAccount>) =>
    onChange({ extraBankAccounts: extraBankAccounts.map((a, i) => (i === index ? { ...a, ...patch } : a)) })
  const updatePromptPay = (index: number, patch: Partial<PromptPayAccount>) =>
    onChange({ extraPromptPays: extraPromptPays.map((a, i) => (i === index ? { ...a, ...patch } : a)) })

  return (
    <div className="mt-5 space-y-5 border-t border-gray-100 pt-5">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-700">บัญชีธนาคารเพิ่มเติม</p>
          <button
            type="button"
            onClick={() => onChange({ extraBankAccounts: [...extraBankAccounts, { bankName: '', accountNumber: '', accountName: '' }] })}
            disabled={extraBankAccounts.length >= MAX_EXTRA_PAYMENT_ACCOUNTS}
            className="flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-50"
          >
            <Plus size={12} />
            เพิ่มบัญชีธนาคาร
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-400">
          มีหลายบัญชีผูกกับ SlipOK (ธนาคารเดียวกันคนละชื่อ/คนละเลข หรือคนละธนาคาร) เพิ่มที่นี่ให้ครบ — ลูกค้าจะเห็นทุกบัญชี และสลิปที่โอนเข้าบัญชีไหนก็ผ่านการเทียบ
          (สูงสุด {MAX_EXTRA_PAYMENT_ACCOUNTS} บัญชี)
        </p>
        <div className="space-y-3">
          {extraBankAccounts.map((a, i) => (
            <div key={`bank-${i}`} className="grid items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
              <SuggestInput
                value={a.bankName}
                options={THAI_BANK_NAMES}
                placeholder="ธนาคาร"
                onChange={value => updateBank(i, { bankName: value })}
                renderIcon={name => <BankBadge bank={name} size={24} />}
                leadingIcon={<BankBadge bank={a.bankName} size={22} />}
              />
              <input
                type="text"
                inputMode="numeric"
                value={a.accountNumber}
                placeholder="เลขที่บัญชี"
                aria-label={`เลขที่บัญชีธนาคารเพิ่มเติมที่ ${i + 1}`}
                onChange={e => updateBank(i, { accountNumber: e.target.value })}
                className={INPUT}
              />
              <input
                type="text"
                value={a.accountName}
                placeholder="ชื่อบัญชี"
                aria-label={`ชื่อบัญชีธนาคารเพิ่มเติมที่ ${i + 1}`}
                onChange={e => updateBank(i, { accountName: e.target.value })}
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => onChange({ extraBankAccounts: extraBankAccounts.filter((_, idx) => idx !== i) })}
                aria-label={`ลบบัญชีธนาคารเพิ่มเติมที่ ${i + 1}`}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-700">พร้อมเพย์เพิ่มเติม</p>
          <button
            type="button"
            onClick={() => onChange({ extraPromptPays: [...extraPromptPays, { id: '', firstName: '', lastName: '' }] })}
            disabled={extraPromptPays.length >= MAX_EXTRA_PAYMENT_ACCOUNTS}
            className="flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-50"
          >
            <Plus size={12} />
            เพิ่มพร้อมเพย์
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-400">
          เบอร์โทร / เลขบัตร ปชช. / เลขวอลเล็ตอื่นๆ ที่ผูกพร้อมเพย์ไว้ — ระบบสร้าง QR ฝังยอดมัดจำให้แต่ละรายการ (สูงสุด {MAX_EXTRA_PAYMENT_ACCOUNTS} รายการ)
        </p>
        <div className="space-y-3">
          {extraPromptPays.map((p, i) => (
            <div key={`pp-${i}`} className="grid items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
              <input
                type="text"
                inputMode="numeric"
                value={p.id}
                placeholder="เลขพร้อมเพย์"
                aria-label={`เลขพร้อมเพย์เพิ่มเติมที่ ${i + 1}`}
                onChange={e => updatePromptPay(i, { id: e.target.value.replace(/[^0-9-]/g, '') })}
                className={INPUT}
              />
              <input
                type="text"
                value={p.firstName}
                placeholder="ชื่อ"
                aria-label={`ชื่อเจ้าของพร้อมเพย์เพิ่มเติมที่ ${i + 1}`}
                onChange={e => updatePromptPay(i, { firstName: e.target.value })}
                className={INPUT}
              />
              <input
                type="text"
                value={p.lastName}
                placeholder="นามสกุล"
                aria-label={`นามสกุลเจ้าของพร้อมเพย์เพิ่มเติมที่ ${i + 1}`}
                onChange={e => updatePromptPay(i, { lastName: e.target.value })}
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => onChange({ extraPromptPays: extraPromptPays.filter((_, idx) => idx !== i) })}
                aria-label={`ลบพร้อมเพย์เพิ่มเติมที่ ${i + 1}`}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
