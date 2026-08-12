import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  Fuel,
  ListOrdered,
  Loader2,
  MapPin,
  Navigation,
  Percent,
  QrCode,
  Save,
  Trash2,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import type { AppSettings } from '../../types'
import { orderedCategories } from '../../data'
import LocationMap from '../../components/LocationMap'
import { pickImageAsDataUrl } from '../../imageUpload'

interface SettingsProps {
  settings: AppSettings
  onUpdateSettings: (patch: Partial<AppSettings>) => void
}

const SHOP_FIELDS: { key: keyof AppSettings['shopInfo']; label: string; placeholder: string }[] = [
  { key: 'name', label: 'ชื่อร้าน (ไทย)', placeholder: 'เช่น ร้าน' },
  { key: 'nameEn', label: 'ชื่อร้าน (อังกฤษ)', placeholder: 'เช่น Pipat Phochana Catering' },
  { key: 'initials', label: 'อักษรย่อ (แสดงบนโลโก้เอกสาร)', placeholder: 'เช่น PP' },
  { key: 'phone', label: 'เบอร์โทรร้าน', placeholder: 'เช่น 034-XXX-XXX' },
  { key: 'line', label: 'Line ID ร้าน', placeholder: 'เช่น @pipatphochana' },
]

const BANK_FIELDS: { key: keyof AppSettings['shopInfo']; label: string; placeholder: string }[] = [
  { key: 'bankName', label: 'ธนาคาร', placeholder: 'เช่น ธนาคารกสิกรไทย' },
  { key: 'bankAccountNumber', label: 'เลขที่บัญชี', placeholder: 'เช่น 123-4-56789-0' },
  { key: 'bankAccountName', label: 'ชื่อบัญชี', placeholder: 'เช่น นายพิพัฒน์ โภชนา' },
]

const WAGE_FIELDS: { key: 'wageChef' | 'wageAssistant' | 'wageServerPerTable' | 'wageDishwasher'; label: string; unit: string }[] = [
  { key: 'wageChef', label: 'ค่าแรงพ่อครัว', unit: 'บาท/คน/งาน' },
  { key: 'wageAssistant', label: 'ค่าแรงผู้ช่วยพ่อครัว', unit: 'บาท/คน/งาน' },
  { key: 'wageServerPerTable', label: 'ค่าแรงพนักงานเสิร์ฟ', unit: 'บาท/โต๊ะ' },
  { key: 'wageDishwasher', label: 'ค่าแรงพนักงานล้างจาน', unit: 'บาท/คน/งาน' },
]

export default function Settings({ settings, onUpdateSettings }: SettingsProps) {
  const [form, setForm] = useState<AppSettings>(settings)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [qrUploading, setQrUploading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  // settings prop เปลี่ยนได้เองจาก polling (คนอื่นแก้ที่เครื่องอื่น) — sync form ตามให้ถ้ายังไม่ได้แก้อะไรค้างไว้
  // (เทียบกับค่า settings "ก่อนหน้า" ไม่ใช่ค่าล่าสุด กัน false positive ตอนกำลังจะเปลี่ยนพอดี)
  const prevSettingsRef = useRef(settings)
  useEffect(() => {
    const prevSettings = prevSettingsRef.current
    prevSettingsRef.current = settings
    setForm(f => (JSON.stringify(f) === JSON.stringify(prevSettings) ? settings : f))
  }, [settings])

  const dirty = JSON.stringify(form) !== JSON.stringify(settings)

  const setShopField = (key: keyof AppSettings['shopInfo'], value: string) => {
    setForm(f => ({ ...f, shopInfo: { ...f.shopInfo, [key]: value } }))
    setSavedAt(null)
  }

  /** เลือกรูป QR พร้อมเพย์จากเครื่อง — ย่อขนาดแล้วเก็บเป็น data URL เหมือนรูปเมนู */
  const handlePickQr = async (file: File | undefined) => {
    if (!file) return
    setQrUploading(true)
    setQrError(null)
    try {
      const dataUrl = await pickImageAsDataUrl(file)
      setShopField('promptPayQr', dataUrl)
    } catch (err) {
      setQrError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setQrUploading(false)
      if (qrInputRef.current) qrInputRef.current.value = ''
    }
  }

  const setNumberField = (
    key:
      | 'depositRate'
      | 'deliveryFee'
      | 'freeDeliveryMinTables'
      | 'wageChef'
      | 'wageAssistant'
      | 'wageServerPerTable'
      | 'wageDishwasher'
      | 'fuelCostPerKm',
    value: number,
  ) => {
    setForm(f => ({ ...f, [key]: value }))
    setSavedAt(null)
  }

  const setShopLocation = (lat: number, lng: number) => {
    setForm(f => ({ ...f, shopLocation: { lat, lng } }))
    setSavedAt(null)
  }

  /** ใช้ตำแหน่งปัจจุบันจาก GPS เป็นตำแหน่งร้าน — สะดวกเวลาตั้งค่าจากหน้าร้านจริง */
  const handleLocateShop = () => {
    if (!navigator.geolocation) {
      setLocateError('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง')
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      p => {
        setLocating(false)
        setShopLocation(p.coords.latitude, p.coords.longitude)
      },
      err => {
        setLocating(false)
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — กรุณาเปิดสิทธิ์ในเบราว์เซอร์'
            : 'ระบุตำแหน่งปัจจุบันไม่สำเร็จ กรุณาปักหมุดบนแผนที่แทน'
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleSave = () => {
    onUpdateSettings(form)
    setSavedAt(Date.now())
  }

  /** สลับลำดับประเภทอาหารกับตัวก่อนหน้า/ถัดไป */
  const moveCategory = (index: number, direction: -1 | 1) => {
    setForm(f => {
      const order = orderedCategories(f.categoryOrder).map(c => c.id)
      const target = index + direction
      if (target < 0 || target >= order.length) return f
      const next = [...order]
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...f, categoryOrder: next }
    })
    setSavedAt(null)
  }

  return (
    <div className="max-w-2xl space-y-5 pb-24">
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

      {/* ข้อมูลการชำระเงิน */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Wallet size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ข้อมูลการชำระเงิน</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          บัญชี/QR พร้อมเพย์ให้ลูกค้าโอนมัดจำ — แสดงในใบเสนอราคาและใบจองทุกใบ
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {BANK_FIELDS.map(({ key, label, placeholder }) => (
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">QR พร้อมเพย์</label>
          <input
            ref={qrInputRef}
            type="file"
            accept="image/*"
            onChange={e => handlePickQr(e.target.files?.[0])}
            className="hidden"
          />

          {form.shopInfo.promptPayQr ? (
            <div className="flex items-center gap-4">
              <img
                src={form.shopInfo.promptPayQr}
                alt="QR พร้อมเพย์"
                className="w-28 h-28 rounded-xl border border-gray-200 object-contain bg-white"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => qrInputRef.current?.click()}
                  disabled={qrUploading}
                  className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {qrUploading ? <Loader2 size={12} className="animate-spin" /> : <QrCode size={12} />}
                  เปลี่ยนรูป
                </button>
                <button
                  type="button"
                  onClick={() => setShopField('promptPayQr', '')}
                  className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Trash2 size={12} />
                  ลบรูป
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => qrInputRef.current?.click()}
              disabled={qrUploading}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 border border-dashed border-gray-300 hover:border-orange-300 rounded-xl px-4 py-6 w-full justify-center transition-colors"
            >
              {qrUploading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              {qrUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป QR พร้อมเพย์'}
            </button>
          )}
          {qrError && <p className="mt-2 text-xs text-red-500">{qrError}</p>}
        </div>
      </div>

      {/* ค่าขนส่ง */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Truck size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ค่าขนส่ง</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          ใช้กับงานนอกพื้นที่ร้านในเขตกรุงเทพ ปริมณฑล และจังหวัดใกล้เคียงที่จองไม่ถึงจำนวนโต๊ะขั้นต่ำ
          — จังหวัดอื่นนอกเหนือจากนี้ไม่มีขั้นต่ำ แต่คิดค่าเดินทางตามระยะทางจริงแทน (ตั้งค่าด้านล่าง)
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

      {/* ค่าเดินทางนอกพื้นที่ — ตำแหน่งร้าน + ค่าน้ำมัน */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Fuel size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ค่าเดินทางนอกพื้นที่ (ต่างจังหวัด)</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          งานในจังหวัดอื่นนอกเหนือจากกรุงเทพ ปริมณฑล และจังหวัดใกล้เคียง รับจัดกี่โต๊ะก็ได้ ไม่มีขั้นต่ำ
          แต่คิดค่าเดินทางไป-กลับจากตำแหน่งร้านตามระยะทางถนนจริง (กิโลเมตร) คูณค่าน้ำมันด้านล่าง
        </p>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">ตำแหน่งที่ตั้งร้าน</label>
            <button
              type="button"
              onClick={handleLocateShop}
              disabled={locating}
              className="flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-3 py-1.5 rounded-full transition-colors"
            >
              {locating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
              ใช้ตำแหน่งปัจจุบัน
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-2">แตะบนแผนที่หรือลากหมุดเพื่อปรับตำแหน่งร้าน</p>

          <LocationMap
            position={form.shopLocation}
            onPinChange={setShopLocation}
            onLocate={handleLocateShop}
            locating={locating}
            className="h-56 w-full rounded-xl overflow-hidden"
          />

          {locateError && <p className="mt-2 text-xs text-red-500">{locateError}</p>}

          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { label: 'Latitude', value: form.shopLocation.lat.toFixed(6) },
              { label: 'Longitude', value: form.shopLocation.lng.toFixed(6) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className="text-xs font-mono font-medium text-gray-700 flex items-center gap-1">
                  <MapPin size={10} className="text-orange-400" />
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-[220px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ค่าน้ำมัน (บาท/กิโลเมตร)</label>
          <input
            type="number"
            min={0}
            step="0.5"
            value={form.fuelCostPerKm}
            onChange={e => setNumberField('fuelCostPerKm', Math.max(0, Number(e.target.value) || 0))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <p className="text-[11px] text-gray-400 mt-1.5">
            ตัวอย่าง: ระยะทาง 50 กม. (ไป-กลับ 100 กม.) × {form.fuelCostPerKm} บาท/กม. ={' '}
            {Math.round(100 * form.fuelCostPerKm).toLocaleString()} บาท
          </p>
        </div>
      </div>

      {/* อัตราค่าแรง */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">อัตราค่าแรง</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          ค่าแรง flat ต่อคนต่องาน ยกเว้นเสิร์ฟที่คิดตามจำนวนโต๊ะโดยตรง — ใช้คำนวณค่าแรงรวมของแต่ละงาน
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {WAGE_FIELDS.map(({ key, label, unit }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={e => setNumberField(key, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-xs text-gray-400 whitespace-nowrap">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ลำดับประเภทอาหาร */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <ListOrdered size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ลำดับประเภทอาหาร</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          ลำดับนี้ใช้แสดงหมวดในหน้าเมนูอาหารและตอนสร้างแพ็กเกจ — สลับลำดับได้ด้วยปุ่มลูกศร
        </p>
        <div className="space-y-1.5">
          {orderedCategories(form.categoryOrder).map((cat, index, arr) => (
            <div key={cat.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3.5 py-2.5">
              <span className="w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <span className="text-base leading-none">{cat.icon}</span>
              <span className="flex-1 text-sm font-medium text-gray-700">{cat.label}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => moveCategory(index, -1)}
                  disabled={index === 0}
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  onClick={() => moveCategory(index, 1)}
                  disabled={index === arr.length - 1}
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors"
                >
                  <ArrowDown size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save — ลอยมุมล่างขวาตลอด กันต้องเลื่อนจอลงมาสุดทุกครั้งที่จะบันทึก */}
      <div className="fixed bottom-6 right-6 sm:right-8 lg:right-10 z-30 flex flex-col items-end gap-2">
        {!dirty && savedAt && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium bg-white px-3 py-1.5 rounded-full shadow-md border border-green-100">
            <Check size={14} />
            บันทึกแล้ว
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-full px-6 py-3.5 text-sm font-semibold shadow-lg shadow-orange-500/30 transition-colors"
        >
          <Save size={16} />
          บันทึกการตั้งค่า
        </button>
      </div>
    </div>
  )
}
