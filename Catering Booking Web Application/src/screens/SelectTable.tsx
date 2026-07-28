import { ChevronLeft, ChevronRight, Minus, Plus, Users } from 'lucide-react'
import Navbar from '../components/Navbar'
import type { Screen, UserProfile } from '../types'
import { DELIVERY_FEE, FREE_DELIVERY_MIN_TABLES, HOME_PROVINCE } from '../geo'

interface SelectTableProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  tables: number
  guestCount: number
  onSetTables: (n: number) => void
  onSetGuestCount: (n: number) => void
  date: string | null
  timeSlot: string | null
}

export default function SelectTable({ navigate, user, tables, guestCount, onSetTables, onSetGuestCount, date, timeSlot }: SelectTableProps) {
  const totalGuests = tables * 10
  const overCapacity = guestCount > totalGuests

  const handleTableInput = (value: string) => {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return
    onSetTables(Math.min(500, Math.max(1, Math.floor(parsed))))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar navigate={navigate} currentScreen="select-table" user={user} />

      <div className="pt-24 pb-12 max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-orange-500 font-semibold text-sm mb-1">ขั้นตอนที่ 2</p>
          <h1 className="text-2xl font-bold text-gray-900">เลือกจำนวนโต๊ะ</h1>
          <p className="text-gray-500 text-sm mt-1">1 โต๊ะ รองรับ 10 ที่นั่ง</p>
        </div>

        {/* Booking summary so far */}
        {date && timeSlot && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-sm font-semibold text-orange-800">
                {new Date(date + 'T00:00:00').toLocaleDateString('th-TH', {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
              <p className="text-xs text-orange-600">{timeSlot}</p>
            </div>
          </div>
        )}

        {/* Table card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-orange-50 rounded-3xl mb-4">
              <span className="text-5xl">🍽️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">โต๊ะมาตรฐาน</h2>
            <p className="text-gray-500 text-sm">1 โต๊ะ รองรับ 10 ที่นั่ง</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => onSetTables(Math.max(1, tables - 1))}
              className="w-12 h-12 bg-gray-100 hover:bg-orange-100 hover:text-orange-600 rounded-2xl flex items-center justify-center transition-all"
            >
              <Minus size={20} />
            </button>

            <div className="text-center min-w-[100px]">
              <input
                type="number"
                min="1"
                max="500"
                value={tables}
                onChange={(e) => handleTableInput(e.target.value)}
                className="w-full text-center text-5xl font-bold text-orange-500 bg-transparent border-b border-orange-200 focus:outline-none"
              />
              <p className="text-gray-400 text-sm mt-1">โต๊ะ</p>
            </div>

            <button
              onClick={() => onSetTables(Math.min(500, tables + 1))}
              className="w-12 h-12 bg-gray-100 hover:bg-orange-100 hover:text-orange-600 rounded-2xl flex items-center justify-center transition-all"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-200 my-6" />

          <div className="grid gap-4 mb-6">
            {/* <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400">จำนวนคนที่ร่วมงาน</p>
                  <p className="text-sm font-semibold text-gray-900">{guestCount} คน</p>
                </div>
              </div>
              <input
                type="number"
                min="1"
                max="5000"
                value={guestCount}
                onChange={(e) => onSetGuestCount(Math.max(1, Math.min(5000, Math.floor(Number(e.target.value) || 1))))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-center text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {overCapacity && (
                <p className="mt-2 text-xs text-red-500">จำนวนคนเกินความจุของโต๊ะปัจจุบัน ({totalGuests} ที่นั่ง)</p>
              )}
            </div> */}
            
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-gray-400 text-xs">จำนวนโต๊ะ</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{tables}</p>
              <p className="text-xs text-gray-400">โต๊ะ</p>
            </div>
            <div className="bg-orange-50 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Users size={12} className="text-orange-400" />
                <span className="text-orange-400 text-xs">รองรับผู้เข้าร่วม</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{totalGuests}</p>
              <p className="text-xs text-orange-400">ที่นั่ง</p>
            </div>
          </div>
          {/* เงื่อนไขพื้นที่ — ตรวจจริงอีกครั้งในขั้นตอนเลือกสถานที่ */}
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
              tables < FREE_DELIVERY_MIN_TABLES
                ? 'bg-amber-50 border-amber-100 text-amber-700'
                : 'bg-green-50 border-green-100 text-green-700'
            }`}
          >
            <p className="font-semibold mb-1">เงื่อนไขพื้นที่จัดงาน</p>
            <p>
              • ใน{HOME_PROVINCE} (พื้นที่ร้าน) รับจัดกี่โต๊ะก็ได้ ไม่มีค่าขนส่ง
            </p>
            <p>
              • นอก{HOME_PROVINCE} ขั้นต่ำ {FREE_DELIVERY_MIN_TABLES} โต๊ะ — กรุงเทพและปริมณฑลไม่ถึงขั้นต่ำ จองได้แต่มีค่าขนส่ง{' '}
              {DELIVERY_FEE.toLocaleString()} บาท
            </p>
            {tables < FREE_DELIVERY_MIN_TABLES && (
              <p className="mt-1.5 font-semibold">
                งานนี้ {tables} โต๊ะ — จัดได้เฉพาะใน{HOME_PROVINCE} หรือกรุงเทพและปริมณฑล (มีค่าขนส่ง)
              </p>
            )}
          </div>
        </div>

          
        
        {/* Table visualization */}
        {/* <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>ตัวอย่างการจัด</span>
            <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">{tables} โต๊ะ</span>
          </p>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: Math.min(tables, 20) }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-10 bg-orange-100 rounded-xl border-2 border-orange-200 flex items-center justify-center">
                  <span className="text-sm">🍽️</span>
                </div>
                <span className="text-[9px] text-gray-400">T{i + 1}</span>
              </div>
            ))}
            {tables > 20 && (
              <div className="flex items-center justify-center w-12 h-10 bg-gray-100 rounded-xl">
                <span className="text-xs text-gray-500">+{tables - 20}</span>
              </div>
            )}
          </div>
        </div> */}

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('booking-calendar')}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl py-4 font-semibold transition-colors"
          >
            <ChevronLeft size={18} />
            ย้อนกลับ
          </button>
          <button
            onClick={() => navigate('select-location')}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-4 font-semibold transition-all shadow-lg shadow-orange-200"
          >
            ถัดไป
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
