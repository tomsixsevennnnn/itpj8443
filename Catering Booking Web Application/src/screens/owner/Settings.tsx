import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CalendarOff,
  Check,
  Clock,
  FileText,
  Fuel,
  ListOrdered,
  Loader2,
  MapPin,
  Navigation,
  Palette,
  Percent,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import type { AppSettings, Category } from '../../types'
import { orderedCategories } from '../../data'
import LocationMap from '../../components/LocationMap'
import PromptPayQr from '../../components/PromptPayQr'
import { pickImageAsDataUrl } from '../../imageUpload'
import { resolveImageUrl, type UploadImageKind } from '../../api'
import { DEFAULT_BRAND_COLOR, applyBrandTheme } from '../../theme'
import { deepTrim } from '../../deepTrim'

interface SettingsProps {
  settings: AppSettings
  onUpdateSettings: (patch: Partial<AppSettings>) => Promise<void>
  onUploadImage: (kind: UploadImageKind, dataUrl: string) => Promise<string>
  onTestSlipOk: (apiKey: string, branchId: string) => Promise<{ ok: boolean; quota?: number; message?: string }>
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

const STAFF_RATIO_FIELDS: { key: 'tablesPerServer' | 'tablesPerSupport' | 'staffRemainderThreshold'; label: string; unit: string; min: number }[] = [
  { key: 'tablesPerServer', label: 'พนักงานเสิร์ฟ 1 คน ต่อกี่โต๊ะ', unit: 'โต๊ะ/คน', min: 1 },
  { key: 'tablesPerSupport', label: 'ผู้ช่วยพ่อครัว/ล้างจาน 1 คน ต่อกี่โต๊ะ', unit: 'โต๊ะ/คน', min: 1 },
  { key: 'staffRemainderThreshold', label: 'เศษเกินกี่โต๊ะ ให้เพิ่มอีก 1 คน', unit: 'โต๊ะ', min: 0 },
]

type SettingsTab = 'shop' | 'finance' | 'delivery' | 'staff' | 'booking' | 'categories'

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: typeof Building2 }[] = [
  { id: 'shop', label: 'ข้อมูลร้าน', icon: Building2 },
  { id: 'finance', label: 'การเงิน', icon: Wallet },
  { id: 'delivery', label: 'ค่าขนส่ง', icon: Truck },
  { id: 'staff', label: 'กำลังคน', icon: Users },
  { id: 'booking', label: 'การจอง & เอกสาร', icon: Clock },
  { id: 'categories', label: 'ประเภทอาหาร', icon: ListOrdered },
]

export default function Settings({ settings, onUpdateSettings, onUploadImage, onTestSlipOk }: SettingsProps) {
  const [form, setForm] = useState<AppSettings>(settings)
  const [activeTab, setActiveTab] = useState<SettingsTab>('shop')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [newMetroProvince, setNewMetroProvince] = useState('')
  const [newClosedDate, setNewClosedDate] = useState('')
  const [newQuotationTerm, setNewQuotationTerm] = useState('')
  const [newBookingTerm, setNewBookingTerm] = useState('')
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('')
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [qrUploading, setQrUploading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [testingSlipOk, setTestingSlipOk] = useState(false)
  const [slipOkTestResult, setSlipOkTestResult] = useState<{ ok: boolean; quota?: number; message?: string } | null>(null)

  // settings prop เปลี่ยนได้เองจาก polling (คนอื่นแก้ที่เครื่องอื่น) — sync form ตามให้ถ้ายังไม่ได้แก้อะไรค้างไว้
  // (เทียบกับค่า settings "ก่อนหน้า" ไม่ใช่ค่าล่าสุด กัน false positive ตอนกำลังจะเปลี่ยนพอดี)
  const prevSettingsRef = useRef(settings)
  useEffect(() => {
    const prevSettings = prevSettingsRef.current
    prevSettingsRef.current = settings
    setForm(f => (JSON.stringify(f) === JSON.stringify(prevSettings) ? settings : f))
  }, [settings])

  // เทียบด้วยค่าที่ trim whitespace หน้า/หลังแล้ว — กันเผลอเพิ่มช่องว่างท้ายข้อความแล้วนับเป็น "แก้ไข" ทั้งที่เนื้อหา
  // จริงเหมือนเดิม (ไม่งั้นปุ่มติด dirty ทั้งที่ไม่มีอะไรเปลี่ยน แถมขึ้นในประวัติการแก้ไขเป็นการแก้ไขปลอม)
  const dirty = JSON.stringify(deepTrim(form)) !== JSON.stringify(settings)

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
      const url = await onUploadImage('promptpay-qr', dataUrl)
      setShopField('promptPayQr', url)
    } catch (err) {
      setQrError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setQrUploading(false)
      if (qrInputRef.current) qrInputRef.current.value = ''
    }
  }

  /** เลือกรูปโลโก้ร้านจากเครื่อง — ย่อขนาดแล้วเก็บเป็น data URL เหมือนรูป QR/เมนู */
  const handlePickLogo = async (file: File | undefined) => {
    if (!file) return
    setLogoUploading(true)
    setLogoError(null)
    try {
      const dataUrl = await pickImageAsDataUrl(file)
      const url = await onUploadImage('shop-logo', dataUrl)
      setShopField('logo', url)
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
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
      | 'fuelCostPerKm'
      | 'tablesPerServer'
      | 'tablesPerSupport'
      | 'staffRemainderThreshold'
      | 'quotationValidDays',
    value: number,
  ) => {
    setForm(f => ({ ...f, [key]: value }))
    setSavedAt(null)
  }

  /** เพิ่มจังหวัด/คำที่นับเป็นโซน metro — พิมพ์แล้วกด Enter หรือปุ่ม "เพิ่ม" */
  const addMetroProvince = () => {
    const name = newMetroProvince.trim()
    if (!name || form.metroProvinces.includes(name)) {
      setNewMetroProvince('')
      return
    }
    setForm(f => ({ ...f, metroProvinces: [...f.metroProvinces, name] }))
    setNewMetroProvince('')
    setSavedAt(null)
  }

  const removeMetroProvince = (name: string) => {
    setForm(f => ({ ...f, metroProvinces: f.metroProvinces.filter(p => p !== name) }))
    setSavedAt(null)
  }

  /** เพิ่มวันหยุดร้าน (ปิด ไม่รับจอง) — เรียงวันที่จากใกล้ไปไกลให้ดูง่าย */
  const addClosedDate = () => {
    if (!newClosedDate || form.closedDates.includes(newClosedDate)) {
      setNewClosedDate('')
      return
    }
    setForm(f => ({ ...f, closedDates: [...f.closedDates, newClosedDate].sort() }))
    setNewClosedDate('')
    setSavedAt(null)
  }

  const removeClosedDate = (date: string) => {
    setForm(f => ({ ...f, closedDates: f.closedDates.filter(d => d !== date) }))
    setSavedAt(null)
  }

  /** เพิ่ม/ลบข้อความเงื่อนไขทีละบรรทัด — ใช้ร่วมกันทั้งใบเสนอราคาและใบจอง */
  const addTerm = (field: 'quotationTerms' | 'bookingTerms', text: string, clear: () => void) => {
    const line = text.trim()
    if (!line) return
    setForm(f => ({ ...f, [field]: [...f[field], line] }))
    clear()
    setSavedAt(null)
  }

  const removeTerm = (field: 'quotationTerms' | 'bookingTerms', index: number) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== index) }))
    setSavedAt(null)
  }

  const setSlotHours = (key: keyof AppSettings['timeSlotHours'], value: string) => {
    setForm(f => ({ ...f, timeSlotHours: { ...f.timeSlotHours, [key]: value } }))
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

  /** เปลี่ยนสีแบรนด์ — พรีวิวทันทีด้วย applyBrandTheme (ยังไม่บันทึกจนกว่าจะกด "บันทึกการตั้งค่า") */
  const setBrandColor = (hex: string) => {
    setForm(f => ({ ...f, brandColor: hex }))
    applyBrandTheme(hex)
    setSavedAt(null)
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onUpdateSettings(deepTrim(form))
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  /** สลับลำดับประเภทอาหารกับตัวก่อนหน้า/ถัดไป */
  const moveCategory = (index: number, direction: -1 | 1) => {
    setForm(f => {
      const order = orderedCategories(f.categoryOrder, f.categories).map(c => c.id)
      const target = index + direction
      if (target < 0 || target >= order.length) return f
      const next = [...order]
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...f, categoryOrder: next }
    })
    setSavedAt(null)
  }

  const updateCategoryField = (id: string, field: 'label' | 'labelEn' | 'icon', value: string) => {
    setForm(f => ({ ...f, categories: f.categories.map(c => (c.id === id ? { ...c, [field]: value } : c)) }))
    setSavedAt(null)
  }

  /** ลบประเภทอาหาร — เมนู/ข้อในแพ็กเกจที่ยังอ้างถึงหมวดนี้อยู่จะไม่หาย แค่โชว์ไอคอน/สีเริ่มต้นแทนหมวดที่หายไป */
  const removeCategory = (id: string) => {
    setForm(f => ({
      ...f,
      categories: f.categories.filter(c => c.id !== id),
      categoryOrder: f.categoryOrder.filter(cid => cid !== id),
    }))
    setSavedAt(null)
  }

  const slugifyCategoryLabel = (text: string): string => {
    const base = text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
    return base || `category-${Date.now()}`
  }

  /** เพิ่มประเภทอาหารใหม่ — id สร้างอัตโนมัติจากชื่อ (กันชนกับ id เดิมด้วยเลขต่อท้าย) */
  const addCategory = () => {
    const label = newCategoryLabel.trim()
    if (!label) return
    const existingIds = new Set(form.categories.map(c => c.id))
    const base = slugifyCategoryLabel(label)
    let id = base
    let suffix = 1
    while (existingIds.has(id)) id = `${base}-${suffix++}`
    const category: Category = {
      id,
      label,
      labelEn: label,
      icon: newCategoryIcon.trim() || '🍽️',
      gradient: 'from-orange-100 to-amber-200',
    }
    setForm(f => ({ ...f, categories: [...f.categories, category], categoryOrder: [...f.categoryOrder, id] }))
    setNewCategoryLabel('')
    setNewCategoryIcon('')
    setSavedAt(null)
  }

  return (
    <div className="max-w-2xl space-y-5 pb-24">
      {/* แท็บย่อย */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
        {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
              activeTab === id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'shop' && (
        <>
      {/* ข้อมูลร้าน */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ข้อมูลร้าน</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">แสดงบนหัวใบเสนอราคาและใบจองทุกใบ</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">โลโก้ร้าน</label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={e => handlePickLogo(e.target.files?.[0])}
            className="hidden"
          />
          <div className="flex items-center gap-4">
            {form.shopInfo.logo ? (
              <img
                src={resolveImageUrl(form.shopInfo.logo)}
                alt="โลโก้ร้าน"
                className="w-16 h-16 rounded-xl border border-gray-200 object-cover bg-white flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-300 text-[10px] text-center px-1">
                ไม่มีโลโก้
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              >
                {logoUploading ? <Loader2 size={12} className="animate-spin" /> : null}
                {logoUploading ? 'กำลังอัปโหลด...' : form.shopInfo.logo ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}
              </button>
              {form.shopInfo.logo && (
                <button
                  type="button"
                  onClick={() => setShopField('logo', '')}
                  className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Trash2 size={12} />
                  ลบโลโก้ (ใช้ไอคอนเริ่มต้น)
                </button>
              )}
            </div>
          </div>
          {logoError && <p className="mt-2 text-xs text-red-500">{logoError}</p>}
        </div>

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

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">คำโปรยหน้า Login</label>
          <input
            type="text"
            value={form.shopInfo.loginTagline}
            placeholder="เช่น ระบบจองจัดเลี้ยงนอกสถานที่"
            onChange={e => setShopField('loginTagline', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* ธีมสี */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Palette size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ธีมสี</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          สีหลักของทั้งเว็บ (ปุ่ม ไฮไลต์ แถบเมนู ฯลฯ) — เปลี่ยนแล้วเห็นผลทันทีเป็นตัวอย่าง กด "บันทึกการตั้งค่า" เพื่อให้ลูกค้าเห็นด้วย
        </p>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={form.brandColor}
            onChange={e => setBrandColor(e.target.value)}
            className="w-14 h-14 rounded-xl border border-gray-200 cursor-pointer bg-white p-1"
          />
          <div className="flex-1">
            <p className="text-sm font-mono font-medium text-gray-700 uppercase">{form.brandColor}</p>
            <button
              type="button"
              onClick={() => setBrandColor(DEFAULT_BRAND_COLOR)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 mt-1.5 transition-colors"
            >
              <RotateCcw size={11} />
              กลับเป็นสีเริ่มต้น
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'finance' && (
        <>
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

        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">เลขพร้อมเพย์ (เบอร์โทร / เลขบัตร ปชช. / เลขวอลเล็ต)</label>
          <p className="text-xs text-gray-400 mb-2">
            กรอกแล้วระบบจะสร้าง QR ใหม่ให้อัตโนมัติทุกใบจอง พร้อมฝังยอดมัดจำที่ถูกต้องไว้ในตัว QR เลย
            (ลูกค้าสแกนแล้วยอดขึ้นเอง ไม่ต้องพิมพ์) ไม่ต้องอัปโหลดรูป QR ด้านล่างอีก
          </p>
          <input
            type="text"
            value={form.shopInfo.promptPayId}
            placeholder="เช่น 0812345678"
            onChange={e => setShopField('promptPayId', e.target.value)}
            className="w-full max-w-xs border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
          />
          <div className="grid sm:grid-cols-2 gap-4 mt-3 max-w-md">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ชื่อ</label>
              <input
                type="text"
                value={form.shopInfo.promptPayFirstName}
                placeholder="เช่น พิพัฒน์"
                onChange={e => setShopField('promptPayFirstName', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">นามสกุล</label>
              <input
                type="text"
                value={form.shopInfo.promptPayLastName}
                placeholder="เช่น โภชนา"
                onChange={e => setShopField('promptPayLastName', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>
          </div>
          {form.shopInfo.promptPayId && (
            <div className="mt-3">
              <PromptPayQr promptPayId={form.shopInfo.promptPayId} amount={100} className="w-28 h-28 rounded-xl border border-gray-200 bg-white" />
              {(form.shopInfo.promptPayFirstName || form.shopInfo.promptPayLastName) && (
                <p className="text-sm text-gray-600 mt-1.5">
                  {form.shopInfo.promptPayFirstName} {form.shopInfo.promptPayLastName}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">ตัวอย่าง QR (ยอด 100 บาท) — ของจริงจะฝังยอดมัดจำตามใบจองแต่ละใบ</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            QR พร้อมเพย์ (สำรอง — ใช้ถ้ายังไม่ได้กรอกเลขพร้อมเพย์ด้านบน)
          </label>
          <div className="grid sm:grid-cols-2 gap-4 mb-3 max-w-md">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ชื่อ</label>
              <input
                type="text"
                value={form.shopInfo.promptPayQrFirstName}
                placeholder="เช่น พิพัฒน์"
                onChange={e => setShopField('promptPayQrFirstName', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">นามสกุล</label>
              <input
                type="text"
                value={form.shopInfo.promptPayQrLastName}
                placeholder="เช่น โภชนา"
                onChange={e => setShopField('promptPayQrLastName', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <input
            ref={qrInputRef}
            type="file"
            accept="image/*"
            onChange={e => handlePickQr(e.target.files?.[0])}
            className="hidden"
          />

          {form.shopInfo.promptPayQr ? (
            <div className="flex items-center gap-4">
              <div>
                <img
                  src={resolveImageUrl(form.shopInfo.promptPayQr)}
                  alt="QR พร้อมเพย์"
                  className="w-28 h-28 rounded-xl border border-gray-200 object-contain bg-white"
                />
                {(form.shopInfo.promptPayQrFirstName || form.shopInfo.promptPayQrLastName) && (
                  <p className="text-sm text-gray-600 mt-1.5">
                    {form.shopInfo.promptPayQrFirstName} {form.shopInfo.promptPayQrLastName}
                  </p>
                )}
              </div>
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

      {/* ตรวจสอบสลิปอัตโนมัติผ่าน SlipOK */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ตรวจสอบสลิปอัตโนมัติ (SlipOK)</h2>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          กรอก API key + Branch ID จากบัญชี SlipOK ของร้าน ให้ระบบยิงตรวจสอบสลิปกับธนาคารจริงทันทีที่ลูกค้าอัปโหลด —
          ปล่อยว่างไว้ได้ถ้ายังไม่ต้องการใช้ ระบบจะรับสลิปตามปกติโดยไม่มีผลตรวจสอบกำกับ
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4 space-y-1.5">
          <p className="font-semibold text-gray-600">วิธีขอ API key + Branch ID:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              เพิ่มเพื่อน LINE Official Account{' '}
              <a href="https://line.me/R/ti/p/@slipok" target="_blank" rel="noreferrer" className="text-orange-500 underline">
                @slipok
              </a>
            </li>
            <li>กรอกข้อมูลธุรกิจ/ร้าน + บัญชีธนาคารที่รับเงินจริงผ่านแชท LINE นั้น</li>
            <li>เลือกช่องทางตรวจสอบเป็น "API" (ไม่ใช่แบบแชทบอทเฉยๆ)</li>
            <li>ระบบจะออก API key + Branch ID ให้ตรงจุดนี้ — เอามากรอกด้านล่างแล้วกด "ทดสอบการเชื่อมต่อ" ก่อนบันทึกได้เลย</li>
          </ol>
          <p className="text-gray-400 pt-1">
            รายละเอียดเพิ่มเติมดูที่{' '}
            <a href="https://slipok.com" target="_blank" rel="noreferrer" className="text-orange-500 underline">
              slipok.com
            </a>
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">SlipOK API key</label>
            <input
              type="password"
              value={form.slipOkApiKey}
              placeholder="เช่น SLIPOKXXXXXXXXXXXX"
              onChange={e => setForm(f => ({ ...f, slipOkApiKey: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">SlipOK Branch ID</label>
            <input
              type="text"
              value={form.slipOkBranchId}
              placeholder="เช่น 12345"
              onChange={e => setForm(f => ({ ...f, slipOkBranchId: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={!form.slipOkApiKey || !form.slipOkBranchId || testingSlipOk}
            onClick={async () => {
              setTestingSlipOk(true)
              setSlipOkTestResult(null)
              try {
                setSlipOkTestResult(await onTestSlipOk(form.slipOkApiKey, form.slipOkBranchId))
              } catch {
                setSlipOkTestResult({ ok: false, message: 'ทดสอบไม่สำเร็จ ลองใหม่อีกครั้ง' })
              } finally {
                setTestingSlipOk(false)
              }
            }}
            className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
          >
            {testingSlipOk ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            ทดสอบการเชื่อมต่อ
          </button>
          {slipOkTestResult && (
            <p className={`text-xs ${slipOkTestResult.ok ? 'text-green-600' : 'text-red-500'}`}>
              {slipOkTestResult.ok
                ? `เชื่อมต่อสำเร็จ${slipOkTestResult.quota !== undefined ? ` — เหลือโควต้า ${slipOkTestResult.quota} ครั้ง` : ''}`
                : slipOkTestResult.message ?? 'เชื่อมต่อไม่สำเร็จ'}
            </p>
          )}
        </div>
      </div>
        </>
      )}

      {activeTab === 'delivery' && (
        <>
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

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">จังหวัดที่ร้านตั้งอยู่ (พื้นที่ร้าน — ไม่มีค่าขนส่ง)</label>
          <input
            type="text"
            value={form.homeProvince}
            placeholder="เช่น นครปฐม"
            onChange={e => {
              setForm(f => ({ ...f, homeProvince: e.target.value }))
              setSavedAt(null)
            }}
            className="w-full max-w-xs border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

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

        {/* จังหวัดที่นับเป็นโซน metro — ระบบตัดสินโซนจากชื่อจังหวัด/ที่อยู่ที่มีคำในรายการนี้อยู่ (ดู zoneFor ใน geo.ts) */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            จังหวัดในเขตกรุงเทพฯ/ปริมณฑล (นับเป็นโซนนี้)
          </label>
          <p className="text-xs text-gray-400 mb-3">
            พิมพ์ชื่อจังหวัดแล้วกด Enter เพื่อเพิ่ม — งานในจังหวัดที่ไม่อยู่ในรายการนี้ (และไม่ใช่นครปฐม) จะถูกจัดเป็น "นอกพื้นที่" อัตโนมัติ
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newMetroProvince}
              onChange={e => setNewMetroProvince(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMetroProvince()
                }
              }}
              placeholder="เช่น ชลบุรี"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={addMetroProvince}
              disabled={!newMetroProvince.trim()}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              เพิ่ม
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.metroProvinces.length === 0 && (
              <p className="text-xs text-gray-400">ยังไม่มีจังหวัดในรายการ — ทุกที่นอกนครปฐมจะถูกคิดเป็น "นอกพื้นที่" ทั้งหมด</p>
            )}
            {form.metroProvinces.map(name => (
              <span
                key={name}
                className="flex items-center gap-1.5 bg-orange-50 text-orange-700 text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-full"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeMetroProvince(name)}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-orange-200 transition-colors"
                  title={`ลบ ${name}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
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
        </>
      )}

      {activeTab === 'staff' && (
        <>
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

        <div className="mt-5 pt-5 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-1.5">สัดส่วนคำนวณแผนกำลังคน</p>
          <p className="text-xs text-gray-400 mb-4">พ่อครัว 1 คน/งานเสมอ (แก้ไม่ได้) — ที่เหลือคำนวณจากสัดส่วนนี้</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {STAFF_RATIO_FIELDS.map(({ key, label, unit, min }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={min}
                    value={form[key]}
                    onChange={e => setNumberField(key, Math.max(min, Math.floor(Number(e.target.value) || min)))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="text-xs text-gray-400 whitespace-nowrap">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'booking' && (
        <>
      {/* ช่วงเวลาจอง */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ช่วงเวลาจอง</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          เวลาที่แสดงให้ลูกค้าเลือกตอนจอง (ชื่อช่วง "เช้า/กลางวัน/เย็น" คงที่ แก้ได้แค่ช่วงเวลา)
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {(
            [
              { key: 'morning', label: 'ช่วงเช้า' },
              { key: 'noon', label: 'ช่วงกลางวัน' },
              { key: 'evening', label: 'ช่วงเย็น' },
            ] as const
          ).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <input
                type="text"
                value={form.timeSlotHours[key]}
                placeholder="เช่น 08:00 - 12:00"
                onChange={e => setSlotHours(key, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* วันหยุดร้าน */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <CalendarOff size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">วันหยุดร้าน</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          วันที่ร้านปิด ไม่รับจอง เช่น วันหยุดนักขัตฤกษ์ — ลูกค้าจะเลือกวันเหล่านี้ในปฏิทินไม่ได้เลย
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={newClosedDate}
            onChange={e => setNewClosedDate(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={addClosedDate}
            disabled={!newClosedDate}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            เพิ่ม
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.closedDates.length === 0 && (
            <p className="text-xs text-gray-400">ยังไม่มีวันหยุด — ร้านรับจองได้ทุกวันที่ยังว่าง</p>
          )}
          {form.closedDates.map(date => (
            <span
              key={date}
              className="flex items-center gap-1.5 bg-orange-50 text-orange-700 text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-full"
            >
              {new Date(date + 'T00:00:00').toLocaleDateString('th-TH', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              })}
              <button
                type="button"
                onClick={() => removeClosedDate(date)}
                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-orange-200 transition-colors"
                title={`ลบวันหยุดนี้`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* เงื่อนไขในเอกสาร */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">เงื่อนไขในเอกสาร</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          เงื่อนไขเรื่องราคา/มัดจำ/ค่าขนส่งระบบคำนวณให้อัตโนมัติตามค่าตั้งค่าด้านบนอยู่แล้ว — ส่วนนี้ไว้เพิ่มเงื่อนไขอื่นๆ ต่อท้าย
        </p>

        <div className="mb-5 max-w-[220px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ใบเสนอราคายืนราคากี่วัน</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={form.quotationValidDays}
              onChange={e => setNumberField('quotationValidDays', Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <span className="text-xs text-gray-400 whitespace-nowrap">วัน</span>
          </div>
        </div>

        {(
          [
            { field: 'quotationTerms' as const, label: 'เงื่อนไขเพิ่มเติมในใบเสนอราคา', value: newQuotationTerm, setValue: setNewQuotationTerm },
            { field: 'bookingTerms' as const, label: 'เงื่อนไขเพิ่มเติมในใบจอง', value: newBookingTerm, setValue: setNewBookingTerm },
          ]
        ).map(({ field, label, value, setValue }) => (
          <div key={field} className="mb-5 last:mb-0">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTerm(field, value, () => setValue(''))
                  }
                }}
                placeholder="พิมพ์เงื่อนไขแล้วกด Enter"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="button"
                onClick={() => addTerm(field, value, () => setValue(''))}
                disabled={!value.trim()}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                เพิ่ม
              </button>
            </div>
            <div className="space-y-1.5">
              {form[field].length === 0 && <p className="text-xs text-gray-400">ยังไม่มีเงื่อนไขเพิ่มเติม</p>}
              {form[field].map((term, i) => (
                <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl px-3.5 py-2.5">
                  <span className="flex-1 text-sm text-gray-700">• {term}</span>
                  <button
                    type="button"
                    onClick={() => removeTerm(field, i)}
                    className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                    title="ลบ"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
        </>
      )}

      {activeTab === 'categories' && (
        <>
      {/* ประเภทอาหาร */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <ListOrdered size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ประเภทอาหาร</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          ใช้เป็นหมวด/ข้อของเมนูโต๊ะจีนทั้งหน้าเมนูอาหารและตอนสร้างแพ็กเกจ — แก้ไอคอน/ชื่อ สลับลำดับด้วยปุ่มลูกศร หรือลบได้
          (เมนู/แพ็กเกจที่ยังอ้างถึงหมวดที่ลบไปจะไม่หาย แค่ไม่มีไอคอน/สีของหมวดนั้นให้)
        </p>
        <div className="space-y-1.5 mb-4">
          {orderedCategories(form.categoryOrder, form.categories).map((cat, index, arr) => (
            <div key={cat.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <span className="w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <input
                type="text"
                value={cat.icon ?? ''}
                onChange={e => updateCategoryField(cat.id, 'icon', e.target.value)}
                className="w-10 flex-shrink-0 text-center text-base border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <input
                type="text"
                value={cat.label}
                placeholder="ชื่อหมวด (ไทย)"
                onChange={e => updateCategoryField(cat.id, 'label', e.target.value)}
                className="flex-1 min-w-0 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <input
                type="text"
                value={cat.labelEn}
                placeholder="ชื่อหมวด (อังกฤษ)"
                onChange={e => updateCategoryField(cat.id, 'labelEn', e.target.value)}
                className="hidden sm:block flex-1 min-w-0 text-sm text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
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
                <button
                  onClick={() => removeCategory(cat.id)}
                  title="ลบหมวดนี้"
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-400 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <input
            type="text"
            value={newCategoryIcon}
            onChange={e => setNewCategoryIcon(e.target.value)}
            placeholder="🍽️"
            className="w-14 flex-shrink-0 text-center text-base border border-gray-200 rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="text"
            value={newCategoryLabel}
            onChange={e => setNewCategoryLabel(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCategory()
              }
            }}
            placeholder="เพิ่มประเภทอาหารใหม่ เช่น ของหมัก"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={!newCategoryLabel.trim()}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
          >
            <Plus size={14} />
            เพิ่ม
          </button>
        </div>
      </div>
        </>
      )}

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
          disabled={!dirty || saving}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-full px-6 py-3.5 text-sm font-semibold shadow-lg shadow-orange-500/30 transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
      </div>
    </div>
  )
}
