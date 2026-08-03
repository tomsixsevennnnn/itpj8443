import { useState } from 'react'
import { AlertCircle, Check, ChevronDown, Edit2, Plus, Trash2, X } from 'lucide-react'
import type { MenuItem, Package, PackageCourse } from '../../types'
import { CATEGORIES, CATEGORY_MAP, requiredCourses } from '../../data'
import type { CreatePackageInput, UpdatePackageInput } from '../../api'

interface PackagesProps {
  packages: Package[]
  /** คลังเมนูของร้าน — มาจากหน้า "เมนูอาหาร" */
  menus: MenuItem[]
  onCreatePackage: (input: CreatePackageInput) => void
  onUpdatePackage: (id: string, input: UpdatePackageInput) => void
  onDeletePackage: (id: string) => void
}

const emptyForm = { name: '', pricePerTable: 0, description: '', badge: '' }

/** ข้อใหม่ 1 ข้อ ตามประเภทอาหารที่เลือก */
const newCourse = (no: number, categoryId: string): PackageCourse => ({
  no,
  title: CATEGORY_MAP[categoryId]?.label ?? 'รายการใหม่',
  category: categoryId,
  choose: 1,
  items: [],
})

/** แพ็กเกจใหม่เริ่มต้นด้วย 9 ข้อ ตามประเภทอาหารทั้งหมด */
const blankCourses = (): PackageCourse[] => CATEGORIES.map((c, i) => newCourse(i + 1, c.id))

export default function Packages({ packages, menus, onCreatePackage, onUpdatePackage, onDeletePackage }: PackagesProps) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Package | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [courses, setCourses] = useState<PackageCourse[]>([])
  const [openCourse, setOpenCourse] = useState<number | null>(null)
  const [showAllCats, setShowAllCats] = useState(false)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setCourses(blankCourses())
    setOpenCourse(1)
    setShowAllCats(false)
    setShowModal(true)
  }

  const openEdit = (pkg: Package) => {
    setEditing(pkg)
    setForm({
      name: pkg.name,
      pricePerTable: pkg.pricePerTable,
      description: pkg.description,
      badge: pkg.badge ?? '',
    })
    // clone ไว้แก้ในโมดัล ยังไม่กระทบของจริงจนกว่าจะกดบันทึก
    setCourses(pkg.courses.map(c => ({ ...c, items: [...c.items] })))
    setOpenCourse(pkg.courses[0]?.no ?? null)
    setShowAllCats(false)
    setShowModal(true)
  }

  /* --- แก้ไขข้อ / เมนูในข้อ --------------------------------------- */

  const patchCourse = (index: number, patch: Partial<PackageCourse>) => {
    setCourses(prev => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const toggleDish = (index: number, dish: MenuItem) => {
    setCourses(prev =>
      prev.map((c, i) => {
        if (i !== index) return c
        const has = c.items.some(x => x.id === dish.id)
        return { ...c, items: has ? c.items.filter(x => x.id !== dish.id) : [...c.items, dish] }
      })
    )
  }

  const addCourse = () => {
    setCourses(prev => {
      const next = [...prev, newCourse(prev.length + 1, CATEGORIES[0].id)]
      setOpenCourse(next.length)
      return next
    })
  }

  const removeCourse = (index: number) => {
    setCourses(prev => prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, no: i + 1 })))
  }

  /** เมนูที่เลือกได้ในข้อนี้ — ปกติกรองตามประเภทของข้อ แต่เมนูที่เลือกไว้แล้วจะแสดงเสมอ */
  const dishesFor = (course: PackageCourse) => {
    const selected = new Set(course.items.map(i => i.id))
    return menus.filter(m => showAllCats || m.category === course.category || selected.has(m.id))
  }

  const emptyCourses = courses.filter(c => c.items.length === 0)
  const canSave = form.name.trim().length > 0 && courses.length > 0 && emptyCourses.length === 0

  const handleSave = () => {
    if (!canSave) return
    const normalized = courses.map((c, i) => ({ ...c, no: i + 1 }))
    const courseInputs = normalized.map(c => ({
      no: c.no,
      title: c.title,
      category: c.category,
      choose: c.choose,
      itemIds: c.items.map(i => i.id),
    }))
    const base = {
      name: form.name,
      pricePerTable: form.pricePerTable,
      description: form.description,
      badge: form.badge.trim(),
      menuLimit: normalized.length,
      courses: courseInputs,
    }
    if (editing) {
      onUpdatePackage(editing.id, base)
    } else {
      onCreatePackage({ ...base, features: ['บริการเสิร์ฟ'] })
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    onDeletePackage(id)
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
              {['ชื่อแพ็กเกจ', 'ราคา/โต๊ะ', 'รายการอาหาร', 'ป้ายกำกับ', 'สถานะ', 'จัดการ'].map(col => (
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
                <td className="px-5 py-4">
                  <p className="text-sm text-gray-700">{pkg.courses.length || pkg.menuLimit} อย่าง</p>
                  <p className="text-xs text-gray-400 mt-0.5">เลือกเองได้ {requiredCourses(pkg).length} ข้อ</p>
                </td>
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{editing ? 'แก้ไขแพ็กเกจ' : 'เพิ่มแพ็กเกจใหม่'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  กำหนดเมนูที่ลูกค้าเลือกได้ในแต่ละประเภทอาหาร
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid md:grid-cols-[17rem_1fr] gap-6 p-6">
                {/* ข้อมูลแพ็กเกจ */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ข้อมูลแพ็กเกจ</p>
                  {[
                    { key: 'name' as const, label: 'ชื่อแพ็กเกจ', placeholder: 'เช่น โต๊ะจีน 2,000' },
                    { key: 'description' as const, label: 'คำอธิบาย', placeholder: 'รายละเอียดแพ็กเกจ' },
                    { key: 'badge' as const, label: 'ป้ายกำกับ', placeholder: 'เช่น แนะนำ (ไม่บังคับ)' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ราคา/โต๊ะ (฿)</label>
                    <input
                      type="number"
                      value={form.pricePerTable}
                      onChange={e => setForm(f => ({ ...f, pricePerTable: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">รายการอาหารทั้งหมด</span>
                      <span className="font-bold text-gray-800">{courses.length} อย่าง</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">ลูกค้าเลือกเองได้</span>
                      <span className="font-bold text-gray-800">
                        {courses.filter(c => c.choose > 0).length} ข้อ
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">รวมในแพ็กเกจ</span>
                      <span className="font-bold text-gray-800">
                        {courses.filter(c => c.choose === 0).length} ข้อ
                      </span>
                    </div>
                  </div>
                </div>

                {/* รายการอาหารแต่ละข้อ */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      เมนูในแต่ละประเภทอาหาร
                    </p>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAllCats}
                        onChange={e => setShowAllCats(e.target.checked)}
                        className="accent-orange-500"
                      />
                      แสดงเมนูทุกประเภท
                    </label>
                  </div>

                  <div className="space-y-2">
                    {courses.map((course, index) => {
                      const cat = CATEGORY_MAP[course.category]
                      const isOpen = openCourse === course.no
                      const isEmpty = course.items.length === 0

                      return (
                        <div
                          key={index}
                          className={`rounded-2xl border overflow-hidden transition-colors ${
                            isEmpty ? 'border-red-200 bg-red-50/40' : 'border-gray-200'
                          }`}
                        >
                          {/* หัวข้อ */}
                          <button
                            onClick={() => setOpenCourse(isOpen ? null : course.no)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-base leading-none">{cat?.icon ?? '🍽️'}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-gray-800 truncate">{course.title}</span>
                              <span className="block text-[11px] text-gray-400">
                                {course.choose === 0 ? 'รวมในแพ็กเกจ' : 'ลูกค้าเลือกได้ 1 อย่าง'} ·{' '}
                                {isEmpty ? (
                                  <span className="text-red-500 font-medium">ยังไม่มีเมนู</span>
                                ) : (
                                  `${course.items.length} เมนู`
                                )}
                              </span>
                            </span>
                            <ChevronDown
                              size={15}
                              className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isOpen && (
                            <div className="px-3.5 pb-3.5 border-t border-gray-100 pt-3 space-y-3">
                              {/* ตั้งค่าข้อ */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">ประเภทอาหาร</label>
                                  <select
                                    value={course.category}
                                    onChange={e => {
                                      const id = e.target.value
                                      patchCourse(index, {
                                        category: id,
                                        title: CATEGORY_MAP[id]?.label ?? course.title,
                                      })
                                    }}
                                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                  >
                                    {CATEGORIES.map(c => (
                                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">ชื่อข้อที่แสดง</label>
                                  <input
                                    type="text"
                                    value={course.title}
                                    onChange={e => patchCourse(index, { title: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <div className="flex gap-1.5">
                                  {[
                                    { value: 1, label: 'ให้ลูกค้าเลือก 1 อย่าง' },
                                    { value: 0, label: 'รวมในแพ็กเกจ' },
                                  ].map(opt => (
                                    <button
                                      key={opt.value}
                                      onClick={() => patchCourse(index, { choose: opt.value })}
                                      className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                                        course.choose === opt.value
                                          ? 'bg-orange-50 border-orange-300 text-orange-600'
                                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  onClick={() => removeCourse(index)}
                                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={11} />
                                  ลบข้อนี้
                                </button>
                              </div>

                              {/* เลือกเมนู */}
                              <div className="grid sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                                {dishesFor(course).map(dish => {
                                  const checked = course.items.some(i => i.id === dish.id)
                                  return (
                                    <label
                                      key={dish.id}
                                      className={`flex items-start gap-2 px-2.5 py-2 rounded-xl border cursor-pointer transition-colors ${
                                        checked
                                          ? 'bg-orange-50 border-orange-200'
                                          : 'bg-white border-gray-100 hover:border-gray-200'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleDish(index, dish)}
                                        className="mt-0.5 accent-orange-500 flex-shrink-0"
                                      />
                                      <span className="min-w-0">
                                        <span className={`block text-xs font-medium leading-tight ${checked ? 'text-orange-700' : 'text-gray-700'}`}>
                                          {dish.name}
                                        </span>
                                        {dish.category !== course.category && (
                                          <span className="block text-[10px] text-gray-400 leading-tight mt-0.5">
                                            {CATEGORY_MAP[dish.category]?.label}
                                          </span>
                                        )}
                                      </span>
                                    </label>
                                  )
                                })}

                                {dishesFor(course).length === 0 && (
                                  <p className="col-span-full text-xs text-gray-400 text-center py-6">
                                    ยังไม่มีเมนูในประเภทนี้ — ติ๊ก "แสดงเมนูทุกประเภท" เพื่อเลือกจากทั้งหมด
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <button
                    onClick={addCourse}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 border border-dashed border-gray-300 text-gray-500 hover:border-orange-300 hover:text-orange-600 rounded-2xl py-2.5 text-xs font-medium transition-colors"
                  >
                    <Plus size={13} />
                    เพิ่มข้อ
                  </button>
                </div>
              </div>
            </div>

            {/* ปุ่มล่าง */}
            <div className="border-t border-gray-100 px-6 py-4 flex items-center gap-3 flex-shrink-0">
              {emptyCourses.length > 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-red-600 flex-1">
                  <AlertCircle size={13} />
                  ข้อ {emptyCourses.map(c => courses.indexOf(c) + 1).join(', ')} ยังไม่ได้เลือกเมนู
                </p>
              ) : (
                <p className="text-xs text-gray-400 flex-1">
                  ลูกค้าจะเห็นเมนูเหล่านี้ในขั้นตอนเลือกเมนูอาหาร
                </p>
              )}
              <button onClick={() => setShowModal(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-orange-200 disabled:shadow-none"
              >
                บันทึกแพ็กเกจ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
