import { useState } from 'react'
import { ChefHat } from 'lucide-react'

interface CompleteProfileProps {
  name: string
  surname: string
  phone: string
  lineId: string
  onComplete: (profile: { name: string; surname: string; phone: string; lineId: string }) => void
}

/**
 * ขอชื่อจริง/นามสกุล/เบอร์โทร/Line ID — เด้งมาหน้านี้ทุกครั้งที่ login จนกว่าจะกรอกครบ (ดู needsProfile ใน App.tsx)
 * ดึงค่าที่เคยกรอกไว้มาแสดงล่วงหน้าเสมอ (ไม่ใช่แค่ครั้งแรก) เผื่อกรอกไว้บางส่วนแล้วแค่ต้องมาเติมที่ขาด
 */
export default function CompleteProfile({ name, surname, phone, lineId, onComplete }: CompleteProfileProps) {
  const [form, setForm] = useState({ name, surname, phone, lineId })

  const handleSave = () => {
    if (!form.name.trim() || !form.surname.trim() || !form.phone) return
    onComplete(form)
  }

  const handleChange = (key: keyof typeof form, value: string) => {
    // เบอร์โทรกรอกได้แค่ตัวเลข ไม่เกิน 10 หลัก
    const next = key === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value
    setForm((f) => ({ ...f, [key]: next }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 w-full max-w-md p-8">
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
          {[
            { key: 'name', label: 'ชื่อจริง *', placeholder: 'ชื่อจริง', type: 'text' },
            { key: 'surname', label: 'นามสกุล *', placeholder: 'นามสกุล', type: 'text' },
            { key: 'phone', label: 'เบอร์โทรศัพท์ *', placeholder: '08XXXXXXXX', type: 'tel', inputMode: 'numeric' as const, maxLength: 10 },
            { key: 'lineId', label: 'Line ID', placeholder: '@yourid', type: 'text' },
          ].map(({ key, label, placeholder, type, inputMode, maxLength }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <input
                type={type}
                inputMode={inputMode}
                maxLength={maxLength}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => handleChange(key as keyof typeof form, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!form.name.trim() || !form.surname.trim() || !form.phone}
          className="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-3.5 font-semibold transition-colors"
        >
          บันทึกและเริ่มใช้งาน
        </button>
      </div>
    </div>
  )
}
