import { useState } from 'react'
import { Edit2, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import type { MenuItem } from '../../types'
import { CATEGORIES, MENU_ITEMS } from '../../data'

export default function Menus() {
  const [activeCategory, setActiveCategory] = useState('appetizer')
  const [menus, setMenus] = useState<(MenuItem & { active?: boolean })[]>(
    MENU_ITEMS.map(m => ({ ...m, active: true }))
  )

  const toggleActive = (id: string) => {
    setMenus(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m))
  }

  const deleteMenu = (id: string) => {
    setMenus(prev => prev.filter(m => m.id !== id))
  }

  const filtered = menus.filter(m => m.category === activeCategory)

  return (
    <div className="flex gap-5 h-full">
      {/* Category sidebar */}
      <div className="w-40 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {CATEGORIES.map((cat) => {
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
                <div>
                  <p className="text-xs font-semibold">{cat.label}</p>
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
            {CATEGORIES.find(c => c.id === activeCategory)?.label}
            <span className="text-sm font-normal text-gray-400 ml-2">({filtered.length} รายการ)</span>
          </h3>
          <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-orange-200">
            <Plus size={14} />
            เพิ่มเมนู
          </button>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((menu) => (
            <div
              key={menu.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                menu.active ? 'border-gray-100' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={menu.image}
                  alt={menu.name}
                  className={`w-full h-full object-cover transition-all ${menu.active ? '' : 'grayscale'}`}
                />
                {!menu.active && (
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
                <p className="text-xs text-gray-400 leading-snug mb-3 line-clamp-2">{menu.description}</p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleActive(menu.id)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors flex-1 justify-center font-medium ${
                      menu.active
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {menu.active ? <Eye size={12} /> : <EyeOff size={12} />}
                    {menu.active ? 'เปิด' : 'ปิด'}
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => deleteMenu(menu.id)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🍽️</p>
              <p>ไม่มีเมนูในหมวดนี้</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
