import { useEffect, useState } from 'react'
import { ChefHat, ChevronRight, Loader2, Store } from 'lucide-react'
import { api } from '../api'
import type { ShopPublic } from '../types'

interface ShopSelectProps {
  onSelect: (shopId: string) => void
}

/** หน้าแรกสุดของแอป (multi-tenant) — ลูกค้าต้องเลือกร้านก่อนเสมอ ถึงจะเห็นหน้า login/เริ่มจองของร้านนั้นได้
 *  ไม่ต้อง login (ดู GET /shops/public ฝั่ง backend) */
export default function ShopSelect({ onSelect }: ShopSelectProps) {
  const [shops, setShops] = useState<ShopPublic[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .shopsPublic()
      .then(setShops)
      .catch(err => setError(err instanceof Error ? err.message : 'โหลดรายชื่อร้านไม่สำเร็จ'))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl shadow-lg shadow-orange-200 mb-4">
            <ChefHat size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">เลือกร้านที่ต้องการจอง</h1>
          <p className="text-gray-500 mt-1 text-sm">เลือกร้านก่อนเริ่มใช้งาน</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 p-4">
          {shops === null && !error && (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              กำลังโหลดรายชื่อร้าน...
            </div>
          )}

          {error && (
            <div className="text-center py-10">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button
                onClick={() => {
                  setError(null)
                  setShops(null)
                  api
                    .shopsPublic()
                    .then(setShops)
                    .catch(err => setError(err instanceof Error ? err.message : 'โหลดรายชื่อร้านไม่สำเร็จ'))
                }}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {shops && shops.length === 0 && !error && (
            <p className="text-center text-sm text-gray-400 py-10">ยังไม่มีร้านเปิดให้บริการ</p>
          )}

          {shops && shops.length > 0 && (
            <div className="space-y-2">
              {shops.map(shop => (
                <button
                  key={shop.id}
                  onClick={() => onSelect(shop.id)}
                  className="w-full flex items-center gap-3 border-2 border-gray-100 hover:border-orange-300 hover:bg-orange-50 rounded-2xl py-3.5 px-4 transition-all text-left group"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                    <Store size={18} />
                  </div>
                  <span className="flex-1 font-medium text-gray-700 group-hover:text-orange-700">{shop.name}</span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-orange-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
