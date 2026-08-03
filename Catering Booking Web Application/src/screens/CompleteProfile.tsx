import { useState } from 'react'
import { ChefHat } from 'lucide-react'

interface CompleteProfileProps {
  name: string
  onComplete: (profile: { phone: string; lineId: string }) => void
}

/** ขอเบอร์โทร/Line ID ครั้งแรกหลัง login ด้วย Google — ข้อมูลอื่น (ชื่อ, อีเมล, รูป) มากับบัญชี Google แล้ว */
export default function CompleteProfile({ name, onComplete }: CompleteProfileProps) {
  const [form, setForm] = useState({ phone: '', lineId: '' })

  const handleSave = () => {
    if (!form.phone) return
    onComplete(form)
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
            { key: 'phone', label: 'เบอร์โทรศัพท์ *', placeholder: '08X-XXX-XXXX', type: 'tel' },
            { key: 'lineId', label: 'Line ID', placeholder: '@yourid', type: 'text' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!form.phone}
          className="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-3.5 font-semibold transition-colors"
        >
          บันทึกและเริ่มใช้งาน
        </button>
      </div>
    </div>
  )
}
