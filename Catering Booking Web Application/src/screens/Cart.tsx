import { useState } from 'react'
import { Calendar, ChevronLeft, Clock, MapPin, Package, Pencil, ShoppingBag, Users, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import DishTile from '../components/DishTile'
import LocationMap from '../components/LocationMap'
import type { BookingData, Package as PackageType, Screen, UserProfile } from '../types'
import { FREE_DELIVERY_MIN_TABLES, HOME_PROVINCE, ZONE_LABEL, deliveryFeeFor, formatFullAddress } from '../geo'

interface CartProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  packages: PackageType[]
  booking: BookingData
  onConfirm: () => void
}

export default function Cart({ navigate, user, packages, booking, onConfirm }: CartProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const pkg = packages.find(p => p.id === booking.packageId) ?? null
  /** จับคู่เมนูที่เลือกกับ "ข้อ" ของแพ็กเกจ เพื่อแสดงตามลำดับเสิร์ฟ */
  const courseOf = (menuId: string) => pkg?.courses.find(c => c.items.some(i => i.id === menuId)) ?? null
  const subtotal = booking.packagePrice * booking.tables
  const deliveryFee = deliveryFeeFor(booking.tables, booking.location)
  const total = subtotal + deliveryFee

  const handleConfirm = () => {
    setShowConfirm(false)
    onConfirm()
    navigate('history')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar navigate={navigate} currentScreen="cart" user={user} />

      <div className="pt-24 pb-12 max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-orange-500 font-semibold text-sm mb-1">ขั้นตอนที่ 6</p>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag size={24} className="text-orange-500" />
            ตะกร้าการจอง
          </h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main details */}
          <div className="md:col-span-2 space-y-4">
            {/* Booking summary card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Calendar size={18} className="text-orange-500" />
                รายละเอียดการจอง
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Calendar, label: 'วันที่จัดงาน', value: booking.date
                    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('th-TH', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      })
                    : '-' },
                  { icon: Clock, label: 'ช่วงเวลา', value: booking.timeSlot || '-' },
                  { icon: MapPin, label: 'สถานที่จัดงาน', value: booking.location ? booking.location.name : '-' },
                  { icon: Users, label: 'จำนวนโต๊ะ', value: `${booking.tables} โต๊ะ (${booking.tables * 10} ที่นั่ง)` },
                  { icon: Users, label: 'จำนวนคนที่ร่วมงาน', value: `${booking.guestCount} คน` },
                  { icon: Package, label: 'แพ็กเกจ', value: booking.packageName || '-' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-gray-800 leading-snug">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event location */}
            {booking.location && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-6 pb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <MapPin size={18} className="text-orange-500" />
                    สถานที่จัดงาน
                  </h2>
                  <button
                    onClick={() => navigate('select-location')}
                    className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Pencil size={12} />
                    แก้ไข
                  </button>
                </div>

                <LocationMap
                  key={`${booking.location.lat},${booking.location.lng}`}
                  position={{ lat: booking.location.lat, lng: booking.location.lng }}
                  interactive={false}
                  className="h-40 w-full"
                />

                <div className="p-6 pt-4 space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{booking.location.name}</p>
                    <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{formatFullAddress(booking.location)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="bg-gray-100 text-gray-600 font-mono px-2.5 py-1 rounded-lg">
                      {booking.location.lat.toFixed(6)}, {booking.location.lng.toFixed(6)}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-medium ${
                        booking.location.zone === 'home'
                          ? 'bg-green-100 text-green-700'
                          : booking.location.zone === 'metro'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {booking.location.province ? `${booking.location.province} · ` : ''}
                      {ZONE_LABEL[booking.location.zone]}
                    </span>
                  </div>

                  {booking.location.detail.accessNote && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 mb-0.5">รายละเอียดการเข้าถึงสถานที่</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{booking.location.detail.accessNote}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected menus */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🍽️</span>
                รายการอาหาร
                <span className="text-sm font-normal text-gray-400">({booking.selectedMenus.length} อย่าง/โต๊ะ)</span>
              </h2>

              {booking.selectedMenus.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">ยังไม่ได้เลือกเมนู</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {booking.selectedMenus.map((menu) => {
                    const course = courseOf(menu.id)
                    return (
                      <div key={menu.id} className="flex items-center gap-3 bg-orange-50 rounded-xl p-2.5">
                        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                          <DishTile item={menu} category={course?.category} emojiClass="text-xl" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-400 leading-none mb-1">
                            {course ? `ข้อ ${course.no} · ${course.title}` : 'เมนูเพิ่มเติม'}
                            {course?.choose === 0 && (
                              <span className="text-blue-500 font-medium"> · แถม</span>
                            )}
                          </p>
                          <p className="text-xs font-semibold text-gray-800 truncate">{menu.name}</p>
                          {menu.extraPrice && (
                            <p className="text-[10px] text-orange-500">+{menu.extraPrice} บาท</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Summary card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 className="font-bold text-gray-900 mb-5">สรุปยอดชำระ</h2>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ราคาแพ็กเกจ ({booking.packageName})</span>
                  <span className="text-gray-700">{booking.packagePrice.toLocaleString()} ฿/โต๊ะ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">จำนวนโต๊ะ</span>
                  <span className="text-gray-700">× {booking.tables}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      ค่าขนส่ง (นอก{HOME_PROVINCE} ไม่ถึง {FREE_DELIVERY_MIN_TABLES} โต๊ะ)
                    </span>
                    <span className="text-gray-700">{deliveryFee.toLocaleString()} ฿</span>
                  </div>
                )}
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">ยอดรวมทั้งหมด</span>
                  <span className="font-bold text-orange-500 text-xl">{total.toLocaleString()} ฿</span>
                </div>
              </div>

              <div className="bg-orange-50 rounded-xl p-3 mb-5 text-xs text-orange-700">
                💳 ชำระเงินเมื่อทีมงานยืนยันการจอง
              </div>

              <button
                onClick={() => setShowConfirm(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-4 font-bold text-lg transition-all shadow-lg shadow-orange-200"
              >
                ยืนยันการจอง
              </button>

              <button
                onClick={() => navigate('select-menu')}
                className="w-full mt-3 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
              >
                <ChevronLeft size={16} />
                ย้อนกลับแก้ไข
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">ยืนยันการจอง</h3>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3 mb-6">
                {[
                  { label: 'วันที่', value: booking.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-' },
                  { label: 'เวลา', value: booking.timeSlot || '-' },
                  { label: 'สถานที่', value: booking.location?.name || '-' },
                  { label: 'จำนวนโต๊ะ', value: `${booking.tables} โต๊ะ` },
                  { label: 'แพ็กเกจ', value: booking.packageName || '-' },
                  { label: 'จำนวนอาหาร', value: `${booking.selectedMenus.length} อย่าง / โต๊ะ` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-800 text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">ราคารวม</span>
                  <span className="font-bold text-orange-500 text-lg">{total.toLocaleString()} ฿</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl py-3.5 font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-3.5 font-semibold transition-all shadow-lg shadow-orange-200"
                >
                  ยืนยันการจอง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
