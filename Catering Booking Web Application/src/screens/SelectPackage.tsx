import { Check, ChevronLeft, ChevronRight, Crown, Sparkles, Star } from 'lucide-react'
import Navbar from '../components/Navbar'
import type { Package, Screen, UserProfile } from '../types'
import { PACKAGES } from '../data'

interface SelectPackageProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  tables: number
  selectedPackageId: string | null
  onSelectPackage: (pkg: Package) => void
}

const PKG_ICONS = [Star, Sparkles, Crown]
const PKG_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-100', accent: 'text-blue-600', badge: 'bg-blue-100 text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
  { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'text-orange-600', badge: 'bg-orange-500 text-white', btn: 'bg-orange-500 hover:bg-orange-600' },
  { bg: 'bg-purple-50', border: 'border-purple-100', accent: 'text-purple-600', badge: 'bg-purple-100 text-purple-600', btn: 'bg-purple-600 hover:bg-purple-700' },
]

export default function SelectPackage({ navigate, user, tables, selectedPackageId, onSelectPackage }: SelectPackageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar navigate={navigate} currentScreen="select-package" user={user} />

      <div className="pt-24 pb-12 max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-orange-500 font-semibold text-sm mb-1">ขั้นตอนที่ 4</p>
          <h1 className="text-2xl font-bold text-gray-900">เลือกแพ็กเกจอาหาร</h1>
          <p className="text-gray-500 text-sm mt-2">เลือกแพ็กเกจที่เหมาะสมกับงานของคุณ ({tables} โต๊ะ)</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {PACKAGES.map((pkg, i) => {
            const colors = PKG_COLORS[i]
            const Icon = PKG_ICONS[i]
            const isSelected = selectedPackageId === pkg.id
            const totalPrice = pkg.pricePerTable * tables

            return (
              <div
                key={pkg.id}
                onClick={() => onSelectPackage(pkg)}
                className={`relative bg-white rounded-3xl border-2 shadow-sm cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${
                  isSelected ? `border-orange-500 shadow-xl shadow-orange-100 -translate-y-1` : 'border-gray-100'
                }`}
              >
                {pkg.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-xs font-bold px-4 py-1.5 rounded-full shadow-sm ${colors.badge}`}>
                      ⭐ {pkg.badge}
                    </span>
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-4 right-4 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}

                <div className="p-6 pt-7">
                  <div className={`inline-flex items-center justify-center w-14 h-14 ${colors.bg} rounded-2xl mb-4`}>
                    <Icon size={24} className={colors.accent} />
                  </div>

                  <h3 className="font-bold text-gray-900 text-lg mb-1">{pkg.name}</h3>
                  <p className="text-gray-500 text-xs mb-5">{pkg.description}</p>

                  <div className="mb-5">
                    <p className="text-3xl font-bold text-gray-900">
                      {pkg.pricePerTable.toLocaleString()}
                      <span className="text-base font-normal text-gray-400 ml-1">บาท/โต๊ะ</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      รวม {tables} โต๊ะ:{' '}
                      <span className="font-semibold text-orange-600">{totalPrice.toLocaleString()} บาท</span>
                    </p>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {pkg.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={10} className="text-green-600" />
                        </div>
                        <span className="text-sm text-gray-600">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">จำนวนเมนูที่เลือกได้</span>
                      <span className="font-bold text-gray-900">{pkg.menuLimit} เมนู</span>
                    </div>
                  </div>

                  <button
                    className={`mt-4 w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all ${
                      isSelected
                        ? 'bg-orange-500 shadow-lg shadow-orange-200'
                        : colors.btn + ' opacity-80'
                    }`}
                  >
                    {isSelected ? '✓ เลือกแล้ว' : 'เลือกแพ็กเกจนี้'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 max-w-sm mx-auto">
          <button
            onClick={() => navigate('select-location')}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl py-4 font-semibold transition-colors"
          >
            <ChevronLeft size={18} />
            ย้อนกลับ
          </button>
          <button
            onClick={() => navigate('select-menu')}
            disabled={!selectedPackageId}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-4 font-semibold transition-all shadow-lg shadow-orange-200 disabled:shadow-none"
          >
            ถัดไป
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
