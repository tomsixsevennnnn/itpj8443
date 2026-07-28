import { Check, ChevronLeft, Plus, X } from 'lucide-react'
import { useState } from 'react'
import Navbar from '../components/Navbar'
import type { MenuItem, Screen, UserProfile } from '../types'
import { CATEGORIES, MENU_ITEMS } from '../data'

interface SelectMenuProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  menuLimit: number
  selectedMenus: MenuItem[]
  onSetMenus: (menus: MenuItem[]) => void
  drinkOption?: 'provided' | 'self' | null
  onSetDrinkOption: (option: 'provided' | 'self') => void
}

export default function SelectMenu({ navigate, user, menuLimit, selectedMenus, onSetMenus, drinkOption, onSetDrinkOption }: SelectMenuProps) {
  const [activeCategory, setActiveCategory] = useState('appetizer')
  const [showDrinkPopup, setShowDrinkPopup] = useState(false)

  const toggleMenu = (item: MenuItem) => {
    const isSelected = selectedMenus.some(m => m.id === item.id)
    if (isSelected) {
      onSetMenus(selectedMenus.filter(m => m.id !== item.id))
    } else if (selectedMenus.length < menuLimit) {
      onSetMenus([...selectedMenus, item])
    }
  }

  const filteredMenus = MENU_ITEMS.filter(m => m.category === activeCategory)
  const progress = (selectedMenus.length / menuLimit) * 100

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      <Navbar navigate={navigate} currentScreen="select-menu" user={user} />

      {/* Fixed header */}
      <div className="pt-16 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-orange-500 font-semibold text-sm">ขั้นตอนที่ 5</p>
              <h1 className="text-xl font-bold text-gray-900">เลือกเมนูอาหาร</h1>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-500">{selectedMenus.length}/{menuLimit}</p>
              <p className="text-xs text-gray-400">เมนูที่เลือก</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress >= 100 ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Selected menu pills */}
          {selectedMenus.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar pb-1">
              {selectedMenus.map(m => (
                <div key={m.id} className="flex-shrink-0 flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-700 text-xs px-3 py-1.5 rounded-full">
                  {m.name}
                  <button onClick={() => toggleMenu(m)} className="hover:text-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <aside className="w-36 bg-white border-r border-gray-100 flex-shrink-0 overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const count = selectedMenus.filter(m => m.category === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex flex-col items-center gap-1.5 px-2 py-4 text-center transition-all relative border-b border-gray-50 ${
                  activeCategory === cat.id
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {activeCategory === cat.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-r-full" />
                )}
                <span className="text-xl">{cat.icon}</span>
                <span className="text-xs font-medium leading-tight">{cat.label}</span>
                {count > 0 && (
                  <span className="text-[9px] bg-orange-500 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </aside>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredMenus.map((item) => {
              const isSelected = selectedMenus.some(m => m.id === item.id)
              const isFull = selectedMenus.length >= menuLimit && !isSelected

              return (
                <button
                  key={item.id}
                  onClick={() => toggleMenu(item)}
                  disabled={isFull}
                  className={`relative bg-white rounded-2xl border-2 overflow-hidden text-left transition-all shadow-sm hover:shadow-md ${
                    isSelected ? 'border-orange-500 shadow-orange-100' : 'border-gray-100'
                  } ${isFull ? 'opacity-50 cursor-not-allowed' : 'hover:border-orange-200 cursor-pointer'}`}
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                        <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check size={16} className="text-white" />
                        </div>
                      </div>
                    )}
                    {!isSelected && !isFull && (
                      <div className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={14} className="text-orange-500" />
                      </div>
                    )}
                    {item.extraPrice && (
                      <div className="absolute top-2 left-2 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        +{item.extraPrice}฿
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className={`font-semibold text-sm leading-tight ${isSelected ? 'text-orange-700' : 'text-gray-800'}`}>
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight line-clamp-2">{item.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t border-gray-100 p-4 flex-shrink-0">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate('select-package')}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl py-3.5 font-semibold transition-colors"
          >
            <ChevronLeft size={18} />
            ย้อนกลับ
          </button>
          <button
            onClick={() => {
              if (!drinkOption) {
                setShowDrinkPopup(true)
              } else {
                navigate('cart')
              }
            }}
            disabled={selectedMenus.length === 0}
            className="flex-2 flex-grow flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-3.5 font-semibold transition-all shadow-lg shadow-orange-200 disabled:shadow-none"
          >
            บันทึก ({selectedMenus.length} เมนู)
          </button>
        </div>
      </div>

      {showDrinkPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
              <h3 className="text-lg font-bold text-white">เครื่องดื่ม</h3>
              <p className="text-sm text-orange-100 mt-2">คุณต้องการให้ร้านเตรียมเครื่องดื่มหรือจะนำมาเอง?</p>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={() => {
                  onSetDrinkOption('provided')
                  setShowDrinkPopup(false)
                  navigate('cart')
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-3 font-semibold transition-all"
              >
                ให้ร้านเตรียมเครื่องดื่มให้
              </button>
              <button
                onClick={() => {
                  onSetDrinkOption('self')
                  setShowDrinkPopup(false)
                  navigate('cart')
                }}
                className="w-full border border-gray-200 hover:border-gray-300 text-gray-700 rounded-2xl py-3 font-semibold transition-all"
              >
                เตรียมเครื่องดื่มมาเอง
              </button>
              <button
                onClick={() => setShowDrinkPopup(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-3"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
