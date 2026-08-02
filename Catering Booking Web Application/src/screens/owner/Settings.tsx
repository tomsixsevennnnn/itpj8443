import { useState } from 'react'
import { Building2, Check, Percent, Save, Truck } from 'lucide-react'
import type { AppSettings } from '../../types'

interface SettingsProps {
  settings: AppSettings
  onUpdateSettings: (patch: Partial<AppSettings>) => void
}

const SHOP_FIELDS: { key: keyof AppSettings['shopInfo']; label: string; placeholder: string }[] = [
  { key: 'name', label: 'ชื่อร้าน (ไทย)', placeholder: 'เช่น ร้านพิพัฒน์โภชนา' },
  { key: 'nameEn', label: 'ชื่อร้าน (อังกฤษ)', placeholder: 'เช่น Pipat Phochana Catering' },
  { key: 'initials', label: 'อักษรย่อ (แสดงบนโลโก้เอกสาร)', placeholder: 'เช่น PP' },
  { key: 'phone', label: 'เบอร์โทรร้าน', placeholder: 'เช่น 034-XXX-XXX' },
  { key: 'line', label: 'Line ID ร้าน', placeholder: 'เช่น @pipatphochana' },
]

export default function Settings({ settings, onUpdateSettings }: SettingsProps) {
  const [form, setForm] = useState<AppSettings>(settings)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(settings)

  const setShopField = (key: keyof AppSettings['shopInfo'], value: string) => {
    setForm(f => ({ ...f, shopInfo: { ...f.shopInfo, [key]: value } }))
    setSavedAt(null)
  }

  const setNumberField = (key: 'depositRate' | 'deliveryFee' | 'freeDeliveryMinTables', value: number) => {
    setForm(f => ({ ...f, [key]: value }))
    setSavedAt(null)
  }

  const handleSave = () => {
    onUpdateSettings(form)
    setSavedAt(Date.now())
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* ข้อมูลร้าน */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ข้อมูลร้าน</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">แสดงบนหัวใบเสนอราคาและใบจองทุกใบ</p>

        <div className="grid sm:grid-cols-2 gap-4">
          {SHOP_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <input
                type="text"
                value={form.shopInfo[key]}
                placeholder={placeholder}
                onChange={e => setShopField(key, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ที่อยู่ร้าน</label>
          <textarea
            value={form.shopInfo.address}
            placeholder="เช่น อ.เมืองนครปฐม จ.นครปฐม 73000"
            rows={2}
            onChange={e => setShopField('address', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* มัดจำ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Percent size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">อัตรามัดจำ</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          สัดส่วนที่ลูกค้าต้องชำระเพื่อยืนยันการจอง ส่วนที่เหลือชำระในวันจัดงาน — แสดงในใบเสนอราคาทุกใบ
        </p>
        <div className="flex items-center gap-3 max-w-[200px]">
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(form.depositRate * 100)}
            onChange={e => {
              const pct = Math.min(100, Math.max(0, Math.floor(Number(e.target.value) || 0)))
              setNumberField('depositRate', pct / 100)
            }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
      </div>

      {/* ค่าขนส่ง */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Truck size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ค่าขนส่ง</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          ใช้กับงานนอกพื้นที่ร้านในเขตกรุงเทพและปริมณฑลที่จองไม่ถึงจำนวนโต๊ะขั้นต่ำ
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ค่าขนส่ง (บาท)</label>
            <input
              type="number"
              min={0}
              value={form.deliveryFee}
              onChange={e => setNumberField('deliveryFee', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">จำนวนโต๊ะขั้นต่ำนอกพื้นที่ร้าน</label>
            <input
              type="number"
              min={1}
              value={form.freeDeliveryMinTables}
              onChange={e => setNumberField('freeDeliveryMinTables', Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl px-6 py-3 text-sm font-semibold transition-colors"
        >
          <Save size={16} />
          บันทึกการตั้งค่า
        </button>
        {!dirty && savedAt && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Check size={14} />
            บันทึกแล้ว
          </span>
        )}
      </div>
    </div>
  )
}
