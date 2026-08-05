import { useRef, useState } from 'react'
import { AlertTriangle, Edit2, Eye, EyeOff, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'
import DishTile from '../../components/DishTile'
import type { AppSettings, MenuItem, Package } from '../../types'
import { CATEGORY_MAP, orderedCategories } from '../../data'
import { pickImageAsDataUrl } from '../../imageUpload'

interface MenusProps {
  menus: MenuItem[]
  packages: Package[]
  settings: AppSettings
  onSaveMenu: (item: MenuItem) => void
  onDeleteMenu: (id: string) => void
}

interface MenuForm {
  name: string
  category: string
  description: string
  extraPrice: number
  costPrice: number
  image: string
}

const emptyForm = (category: string): MenuForm => ({
  name: '',
  category,
  description: '',
  extraPrice: 0,
  costPrice: 0,
  image: '',
})

export default function Menus({ menus, packages, settings, onSaveMenu, onDeleteMenu }: MenusProps) {
  const categories = orderedCategories(settings.categoryOrder)
  const [activeCategory, setActiveCategory] = useState(categories[0].id)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState<MenuForm>(emptyForm(categories[0].id))
  const [confirmDelete, setConfirmDelete] = useState<MenuItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** เลือกรูปจากเครื่อง — ย่อขนาดแล้วเก็บเป็นรูปในเมนูเลย */
  const handlePickImage = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setImageError(null)
    try {
      const dataUrl = await pickImageAsDataUrl(file)
      setForm(f => ({ ...f, image: dataUrl }))
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filtered = menus.filter(m => m.category === activeCategory)

  /** เมนูนี้ถูกใช้ในกี่แพ็กเกจ (ใช้เตือนก่อนลบ) */
  const usageOf = (id: string) =>
    packages.filter(p => p.courses.some(c => c.items.some(i => i.id === id))).map(p => p.name)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm(activeCategory))
    setImageError(null)
    setShowModal(true)
  }

  const openEdit = (item: MenuItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      category: item.category,
      description: item.description,
      extraPrice: item.extraPrice ?? 0,
      costPrice: item.costPrice ?? 0,
      image: item.image ?? '',
    })
    setImageError(null)
    setShowModal(true)
  }

  const canSave = form.name.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    const item: MenuItem = {
      id: editing?.id ?? `menu-${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      active: editing?.active ?? true,
      ...(form.extraPrice > 0 ? { extraPrice: form.extraPrice } : {}),
      ...(form.costPrice > 0 ? { costPrice: form.costPrice } : {}),
      ...(form.image.trim() ? { image: form.image.trim() } : {}),
    }
    onSaveMenu(item)
    setActiveCategory(item.category)
    setShowModal(false)
  }

  const toggleActive = (item: MenuItem) => {
    onSaveMenu({ ...item, active: item.active === false })
  }

  const previewItem: MenuItem = {
    id: 'preview',
    name: form.name || 'ชื่อเมนู',
    category: form.category,
    description: form.description,
    ...(form.image.trim() ? { image: form.image.trim() } : {}),
  }

  return (
    <div className="flex gap-5 h-full">
      {/* Category sidebar */}
      <div className="w-40 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {categories.map((cat) => {
            const count = menus.filter(m => m.category === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-gray-50 last:border-0 relative ${
                  activeCategory === cat.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {activeCategory === cat.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-r-full" />
                )}
                <span className="text-lg">{cat.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight">{cat.label}</p>
                  <p className="text-[10px] text-gray-400">{count} รายการ</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Menu grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">
            {CATEGORY_MAP[activeCategory]?.label}
            <span className="text-sm font-normal text-gray-400 ml-2">({filtered.length} รายการ)</span>
          </h3>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-orange-200"
          >
            <Plus size={14} />
            เพิ่มเมนู
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((menu) => {
            const isActive = menu.active !== false
            const usedIn = usageOf(menu.id)
            return (
              <div
                key={menu.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="relative aspect-video bg-gray-100">
                  <DishTile item={menu} emojiClass="text-3xl" className={isActive ? '' : 'grayscale'} />
                  {!isActive && (
                    <div className="absolute inset-0 bg-gray-900/30 flex items-center justify-center">
                      <span className="bg-white/90 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full">ปิดใช้งาน</span>
                    </div>
                  )}
                  {menu.extraPrice && (
                    <div className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      +{menu.extraPrice}฿
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-800 text-sm mb-0.5">{menu.name}</p>
                  <p className="text-xs text-gray-400 leading-snug mb-2 line-clamp-2 min-h-[2rem]">
                    {menu.description || '—'}
                  </p>
                  {usedIn.length > 0 && (
                    <p className="text-[10px] text-blue-500 mb-2">ใช้ใน {usedIn.length} แพ็กเกจ</p>
                  )}

                  {menu.costPrice != null && (
                    <div className="flex items-center gap-2 text-[10px] mb-2">
                      <span className="text-gray-400">ทุน ฿{menu.costPrice.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleActive(menu)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors flex-1 justify-center font-medium ${
                        isActive
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                      {isActive ? 'เปิด' : 'ปิด'}
                    </button>
                    <button
                      onClick={() => openEdit(menu)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(menu)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="mb-4">ไม่มีเมนูในหมวดนี้</p>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus size={14} />
                เพิ่มเมนูแรก
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-900 text-lg">{editing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* ตัวอย่างการ์ด */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <DishTile item={previewItem} emojiClass="text-2xl" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400">ตัวอย่างที่ลูกค้าเห็น</p>
                  <p className="font-semibold text-gray-800 text-sm truncate">{previewItem.name}</p>
                  <p className="text-xs text-gray-400 line-clamp-1">{form.description || '—'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ชื่อเมนู <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น ปลากะพงนึ่งมะนาว"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ประเภทอาหาร</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">คำอธิบาย</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="เช่น ปลากะพงนึ่งราดน้ำมะนาวพริกสด"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ราคาเพิ่ม (฿)</label>
                <input
                  type="number"
                  min="0"
                  value={form.extraPrice}
                  onChange={e => setForm(f => ({ ...f, extraPrice: Math.max(0, Number(e.target.value) || 0) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-[10px] text-gray-400 mt-1">0 = ไม่มีค่าใช้จ่ายเพิ่ม</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ราคาทุนต่อจาน (฿)</label>
                <input
                  type="number"
                  min="0"
                  value={form.costPrice}
                  onChange={e => setForm(f => ({ ...f, costPrice: Math.max(0, Number(e.target.value) || 0) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* รูปภาพเมนู — เลือกไฟล์จากเครื่อง */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">รูปภาพเมนู</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => handlePickImage(e.target.files?.[0])}
                  className="hidden"
                />

                {form.image ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={form.image}
                      alt="รูปเมนู"
                      className="w-28 h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        <ImagePlus size={13} />
                        เปลี่ยนรูป
                      </button>
                      <button
                        onClick={() => setForm(f => ({ ...f, image: '' }))}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-medium transition-colors"
                      >
                        <Trash2 size={13} />
                        ลบรูป
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/40 rounded-xl py-5 transition-colors disabled:opacity-60"
                  >
                    {uploading ? (
                      <Loader2 size={20} className="text-orange-500 animate-spin" />
                    ) : (
                      <ImagePlus size={20} className="text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-600">
                      {uploading ? 'กำลังประมวลผลรูป...' : 'เลือกรูปจากเครื่อง'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      JPG / PNG ไม่เกิน 8 MB · ไม่ใส่ก็ได้ ระบบใช้ไอคอนตามประเภทแทน
                    </span>
                  </button>
                )}

                {imageError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
                    <AlertTriangle size={12} />
                    {imageError}
                  </p>
                )}
              </div>

              {editing && usageOf(editing.id).length > 0 && (
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl px-3 py-2.5 text-xs">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    เมนูนี้ถูกใช้ใน {usageOf(editing.id).join(', ')} — แก้แล้วจะอัปเดตในแพ็กเกจให้อัตโนมัติ
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 font-semibold text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl py-3 font-semibold text-sm transition-colors shadow-lg shadow-orange-200 disabled:shadow-none"
              >
                {editing ? 'บันทึกการแก้ไข' : 'เพิ่มเมนู'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">ลบ "{confirmDelete.name}"?</h3>
            {usageOf(confirmDelete.id).length > 0 ? (
              <p className="text-sm text-gray-500 leading-relaxed">
                เมนูนี้ถูกใช้ใน <span className="font-semibold text-red-600">{usageOf(confirmDelete.id).join(', ')}</span>{' '}
                — ลบแล้วจะถูกถอดออกจากแพ็กเกจเหล่านั้นด้วย
              </p>
            ) : (
              <p className="text-sm text-gray-500">ลบแล้วจะไม่สามารถกู้คืนได้</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 font-semibold text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onDeleteMenu(confirmDelete.id)
                  setConfirmDelete(null)
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
              >
                ลบเมนู
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
