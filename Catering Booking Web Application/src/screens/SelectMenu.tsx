import { Check, ChevronLeft, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import DishTile from '../components/DishTile'
import type { MenuItem, Package, PackageCourse, Screen, ShopInfo, UserProfile } from '../types'
import { CATEGORY_MAP, includedItems, requiredCourses } from '../data'

interface SelectMenuProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  shopInfo: ShopInfo
  packages: Package[]
  packageId: string | null
  selectedMenus: MenuItem[]
  onSetMenus: (menus: MenuItem[]) => void
}

export default function SelectMenu({ navigate, user, shopInfo, packages, packageId, selectedMenus, onSetMenus }: SelectMenuProps) {
  const pkg = packages.find(p => p.id === packageId) ?? null
  const [activeCourseNo, setActiveCourseNo] = useState(1)

  const selectedIds = useMemo(() => new Set(selectedMenus.map(m => m.id)), [selectedMenus])

  /** เรียงรายการที่เลือกตามลำดับข้อของแพ็กเกจ */
  const sortByCourse = (items: MenuItem[]) => {
    if (!pkg) return items
    const order = new Map<string, number>()
    pkg.courses.forEach(c => c.items.forEach(i => order.set(i.id, c.no)))
    return [...items].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
  }

  // รายการที่รวมมาให้ในแพ็กเกจ ถูกใส่ให้อัตโนมัติเสมอ
  useEffect(() => {
    if (!pkg) return
    const missing = includedItems(pkg).filter(i => !selectedIds.has(i.id))
    if (missing.length > 0) onSetMenus(sortByCourse([...selectedMenus, ...missing]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg, selectedIds])

  if (!pkg) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar navigate={navigate} currentScreen="select-menu" user={user} shopInfo={shopInfo} />
        <div className="pt-32 text-center px-6">
          <p className="text-5xl mb-4">🍽️</p>
          <p className="text-gray-500 mb-6">กรุณาเลือกแพ็กเกจก่อนเลือกเมนูอาหาร</p>
          <button
            onClick={() => navigate('select-package')}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-6 py-3 font-semibold transition-colors"
          >
            ไปเลือกแพ็กเกจ
          </button>
        </div>
      </div>
    )
  }

  const activeCourse = pkg.courses.find(c => c.no === activeCourseNo) ?? pkg.courses[0]
  const chosenIn = (course: PackageCourse) => course.items.find(i => selectedIds.has(i.id)) ?? null

  const required = requiredCourses(pkg)
  /** ข้อที่แพ็กเกจแถมมาให้ ไม่ต้องเลือก แต่นับรวมเป็นอาหารบนโต๊ะด้วย */
  const includedCount = pkg.courses.length - required.length
  const doneCount = required.filter(c => chosenIn(c) !== null).length
  const progress = required.length > 0 ? (doneCount / required.length) * 100 : 100
  const allDone = doneCount === required.length

  const chooseItem = (course: PackageCourse, item: MenuItem) => {
    if (course.choose === 0) return
    const courseIds = new Set(course.items.map(i => i.id))
    const rest = selectedMenus.filter(m => !courseIds.has(m.id))
    const alreadyChosen = selectedIds.has(item.id)
    onSetMenus(sortByCourse(alreadyChosen ? rest : [...rest, item]))

    if (!alreadyChosen) {
      const next =
        pkg.courses.find(c => c.no > course.no && c.choose > 0 && !chosenIn(c)) ??
        pkg.courses.find(c => c.choose > 0 && !chosenIn(c) && c.no !== course.no)
      if (next) setActiveCourseNo(next.no)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      <Navbar navigate={navigate} currentScreen="select-menu" user={user} shopInfo={shopInfo} />

      {/* Fixed header */}
      <div className="pt-16 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-orange-500 font-semibold text-sm">ขั้นตอนที่ 5</p>
              <h1 className="text-xl font-bold text-gray-900">เลือกเมนูอาหาร</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {pkg.name} · เลือกเอง {required.length} ข้อ (ข้อละ 1 อย่าง)
                {includedCount > 0 && ` + แถมให้อีก ${includedCount} อย่าง`}
                {' = อาหาร '}{pkg.courses.length} อย่าง/โต๊ะ
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-500">
                {doneCount}/{required.length}
              </p>
              <p className="text-xs text-gray-400">ข้อที่ต้องเลือกเอง</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allDone ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Course sidebar */}
        <aside className="w-44 bg-white border-r border-gray-100 flex-shrink-0 overflow-y-auto">
          {pkg.courses.map(course => {
            const cat = CATEGORY_MAP[course.category]
            const chosen = chosenIn(course)
            const isActive = course.no === activeCourse.no
            return (
              <button
                key={course.no}
                onClick={() => setActiveCourseNo(course.no)}
                className={`w-full flex items-start gap-2 px-3 py-3 text-left transition-all relative border-b border-gray-50 ${
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-r-full" />}
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                    chosen ? 'bg-green-500 text-white' : isActive ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {chosen ? <Check size={11} /> : course.no}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-xs font-semibold leading-tight">
                    <span>{course.icon || cat?.icon}</span>
                    <span className="truncate">{course.title}</span>
                  </span>
                  <span className="block text-[10px] leading-tight mt-0.5 truncate text-gray-400">
                    {course.choose === 0 ? 'รวมในแพ็กเกจ' : chosen ? chosen.name : `${course.items.length} ตัวเลือก`}
                  </span>
                </span>
              </button>
            )
          })}
        </aside>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-gray-900">
                ข้อ {activeCourse.no} · {activeCourse.title}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {CATEGORY_MAP[activeCourse.category]?.labelEn}
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                activeCourse.choose === 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
              }`}
            >
              {activeCourse.choose === 0 ? 'รวมในแพ็กเกจ' : `เลือกได้ ${activeCourse.choose} อย่าง`}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeCourse.items.map(item => {
              const isSelected = selectedIds.has(item.id)
              const isFixed = activeCourse.choose === 0

              return (
                <button
                  key={item.id}
                  onClick={() => chooseItem(activeCourse, item)}
                  disabled={isFixed}
                  className={`relative bg-white rounded-2xl border-2 overflow-hidden text-left transition-all shadow-sm ${
                    isSelected ? 'border-orange-500 shadow-orange-100' : 'border-gray-100'
                  } ${isFixed ? 'cursor-default' : 'hover:shadow-md hover:border-orange-200 cursor-pointer'}`}
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    <DishTile item={item} category={activeCourse.category} emojiClass="text-4xl" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                        <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check size={16} className="text-white" />
                        </div>
                      </div>
                    )}
                    {isFixed && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
                        <Lock size={9} />
                        รวมให้แล้ว
                      </div>
                    )}
                    {item.extraPrice && (
                      <div className="absolute top-2 right-2 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
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
            onClick={() => navigate('cart')}
            disabled={!allDone}
            className="flex-2 flex-grow flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-3.5 font-semibold transition-all shadow-lg shadow-orange-200 disabled:shadow-none"
          >
            {allDone
              ? `บันทึก · อาหาร ${selectedMenus.length} อย่าง`
              : `เลือกอีก ${required.length - doneCount} ข้อ`}
          </button>
        </div>
      </div>
    </div>
  )
}
