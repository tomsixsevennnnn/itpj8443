import { useState } from 'react'
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react'
import type { Package } from '../../types'
import { PACKAGES } from '../../data'

export default function Packages() {
  const [packages, setPackages] = useState<Package[]>(PACKAGES)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Package | null>(null)
  const [form, setForm] = useState({ name: '', pricePerTable: 0, menuLimit: 7, description: '', badge: '' })

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', pricePerTable: 0, menuLimit: 7, description: '', badge: '' })
    setShowModal(true)
  }

  const openEdit = (pkg: Package) => {
    setEditing(pkg)
    setForm({ name: pkg.name, pricePerTable: pkg.pricePerTable, menuLimit: pkg.menuLimit, description: pkg.description, badge: pkg.badge || '' })
    setShowModal(true)
  }

  const handleSave = () => {
    if (editing) {
      setPackages(prev => prev.map(p => p.id === editing.id ? { ...p, ...form } : p))
    } else {
      setPackages(prev => [...prev, { ...form, id: Date.now().toString(), features: ['บริการเสิร์ฟ'] }])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    setPackages(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">จัดการแพ็กเกจ</h2>
          <p className="text-sm text-gray-500 mt-0.5">{packages.length} แพ็กเกจ</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-orange-200"
        >
          <Plus size={16} />
          เพิ่มแพ็กเกจ
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['ชื่อแพ็กเกจ', 'ราคา/โต๊ะ', 'จำนวนเมนู', 'ป้ายกำกับ', 'สถานะ', 'จัดการ'].map(col => (
                <th key={col} className="px-5 py-4 text-left text-xs font-semibold text-gray-500">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-semibold text-gray-800">{pkg.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pkg.description}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="font-bold text-orange-600">{pkg.pricePerTable.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 ml-1">฿</span>
                </td>
                <td className="px-5 py-4 text-sm text-gray-700">{pkg.menuLimit} เมนู</td>
                <td className="px-5 py-4">
                  {pkg.badge ? (
                    <span className="bg-orange-100 text-orange-600 text-xs font-medium px-2.5 py-1 rounded-full">{pkg.badge}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1.5 rounded-full">
                    <Check size={10} />
                    เปิดใช้งาน
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(pkg)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 text-lg">{editing ? 'แก้ไขแพ็กเกจ' : 'เพิ่มแพ็กเกจใหม่'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { key: 'name', label: 'ชื่อแพ็กเกจ', type: 'text', placeholder: 'เช่น แพ็กเกจ Standard' },
                { key: 'description', label: 'คำอธิบาย', type: 'text', placeholder: 'รายละเอียดแพ็กเกจ' },
                { key: 'badge', label: 'ป้ายกำกับ', type: 'text', placeholder: 'เช่น แนะนำ (ไม่บังคับ)' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ราคา/โต๊ะ (฿)</label>
                  <input
                    type="number"
                    value={form.pricePerTable}
                    onChange={e => setForm(f => ({ ...f, pricePerTable: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">จำนวนเมนู</label>
                  <input
                    type="number"
                    value={form.menuLimit}
                    onChange={e => setForm(f => ({ ...f, menuLimit: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl py-3.5 font-semibold transition-colors">
                ยกเลิก
              </button>
              <button onClick={handleSave} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-3.5 font-semibold transition-colors shadow-lg shadow-orange-200">
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
