import { useState } from 'react'
import { ArrowLeft, ChefHat } from 'lucide-react'
import { TEXT_LIMITS, digitsOnly, isValidPhone, lettersOnly, lineIdOnly } from '../inputRules'

interface CompleteProfileProps {
  name: string
  surname: string
  phone: string
  lineId: string
  onComplete: (profile: { name: string; surname: string; phone: string; lineId: string }) => void
  /** กลับไปหน้าก่อนหน้า (หน้า login/เลือกร้าน) — หน้านี้บังคับกรอกก่อนเข้าใช้งาน ไม่มีหน้าในแอปให้ย้อนไป จึงออกจากระบบแล้วกลับหน้า login */
  onBack: () => void
}

type FormKey = 'name' | 'surname' | 'phone' | 'lineId'

/** กรองตอนพิมพ์/วาง: ชื่อ-นามสกุลเฉพาะตัวอักษร, เบอร์โทรเฉพาะตัวเลขไม่เกิน 10 หลัก, Line ID เฉพาะอักษรอังกฤษ/ตัวเลข/ . _ - @
 *  (ต้องตรงกับที่ backend ตรวจซ้ำใน UpdateProfileDto) */
const FILTERS: Record<FormKey, (v: string) => string> = {
  name: (v) => lettersOnly(v).slice(0, TEXT_LIMITS.personName),
  surname: (v) => lettersOnly(v).slice(0, TEXT_LIMITS.personName),
  phone: (v) => digitsOnly(v).slice(0, 10),
  lineId: (v) => lineIdOnly(v).slice(0, TEXT_LIMITS.lineId),
}

const FIELDS: { key: FormKey; label: string; placeholder: string; type: string; inputMode?: 'numeric'; maxLength: number }[] = [
  { key: 'name', label: 'ชื่อจริง *', placeholder: 'ชื่อจริง (ตัวอักษรเท่านั้น)', type: 'text', maxLength: TEXT_LIMITS.personName },
  { key: 'surname', label: 'นามสกุล *', placeholder: 'นามสกุล (ตัวอักษรเท่านั้น)', type: 'text', maxLength: TEXT_LIMITS.personName },
  { key: 'phone', label: 'เบอร์โทรศัพท์ *', placeholder: '08XXXXXXXX', type: 'tel', inputMode: 'numeric', maxLength: 10 },
  { key: 'lineId', label: 'Line ID', placeholder: '@yourid', type: 'text', maxLength: TEXT_LIMITS.lineId },
]

/**
 * ขอชื่อจริง/นามสกุล/เบอร์โทร/Line ID — เด้งมาหน้านี้ทุกครั้งที่ login จนกว่าจะกรอกครบ (ดู needsProfile ใน App.tsx)
 * ดึงค่าที่เคยกรอกไว้มาแสดงล่วงหน้าเสมอ (ไม่ใช่แค่ครั้งแรก) เผื่อกรอกไว้บางส่วนแล้วแค่ต้องมาเติมที่ขาด
 */
export default function CompleteProfile({ name, surname, phone, lineId, onComplete, onBack }: Readonly<CompleteProfileProps>) {
  // ค่าเริ่มต้นที่ดึงมาจาก Google (ชื่อ/นามสกุล) อาจมีตัวเลข/อักษรพิเศษ — ทำความสะอาดก่อนแสดง
  // ไม่งั้นกดบันทึกแล้วโดน backend ปฏิเสธโดยผู้ใช้ไม่เข้าใจเหตุผล
  const [form, setForm] = useState<Record<FormKey, string>>({
    name: FILTERS.name(name).trim(),
    surname: FILTERS.surname(surname).trim(),
    phone: FILTERS.phone(phone),
    lineId: FILTERS.lineId(lineId),
  })
  const [touched, setTouched] = useState<Partial<Record<FormKey, boolean>>>({})

  /** ข้อความแจ้งใต้ช่อง — ขึ้นเมื่อผู้ใช้แตะช่องนั้นแล้วออกไป (ไม่ขึ้นระหว่างยังพิมพ์ไม่เสร็จ) */
  const errors: Partial<Record<FormKey, string>> = {
    name: form.name.trim() ? '' : 'กรุณากรอกชื่อจริง (ตัวอักษรเท่านั้น)',
    surname: form.surname.trim() ? '' : 'กรุณากรอกนามสกุล (ตัวอักษรเท่านั้น)',
    phone: isValidPhone(form.phone) ? '' : 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0',
  }
  const isValid = !errors.name && !errors.surname && !errors.phone

  const handleSave = () => {
    if (!isValid) {
      setTouched({ name: true, surname: true, phone: true })
      return
    }
    onComplete({ ...form, name: form.name.trim(), surname: form.surname.trim() })
  }

  const handleChange = (key: FormKey, value: string) => {
    setForm((f) => ({ ...f, [key]: FILTERS[key](value) }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 w-full max-w-md p-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          กลับ
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <ChefHat size={20} className="text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">สวัสดีคุณ {name}</h3>
            <p className="text-xs text-gray-400">กรอกข้อมูลเพิ่มเติมเพื่อการติดต่อ</p>
          </div>
        </div>

        <div className="space-y-4">
          {FIELDS.map(({ key, label, placeholder, type, inputMode, maxLength }) => {
            const showError = !!touched[key] && !!errors[key]
            return (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {label}
                  <input
                    type={type}
                    inputMode={inputMode}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
                    aria-invalid={showError}
                    className={`mt-1.5 w-full border rounded-xl px-4 py-3 text-sm font-normal focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      showError ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-orange-400'
                    }`}
                  />
                </label>
                {showError && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid}
          className="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-3.5 font-semibold transition-colors"
        >
          บันทึกและเริ่มใช้งาน
        </button>
      </div>
    </div>
  )
}
