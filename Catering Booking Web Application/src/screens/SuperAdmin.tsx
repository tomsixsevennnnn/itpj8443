import { useState } from 'react'
import { Loader2, LogOut, Plus, Power, Shield, Store, UserPlus } from 'lucide-react'
import { useNav } from '../NavContext'
import type { ShopAdmin } from '../api'

interface SuperAdminProps {
  shops: ShopAdmin[]
  onCreateShop: (input: { name: string; ownerEmail: string }) => Promise<void>
  onSetShopStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') => Promise<void>
  onAddOwner: (id: string, email: string) => Promise<void>
}

/** หน้าเดียวจบสำหรับ super admin — จัดการร้านทั้งระบบ (สร้าง/ระงับ-เปิดใช้งาน/เพิ่ม owner) ไม่ใช้ OwnerLayout
 *  เพราะเป็นบทบาทที่ไม่ผูกกับร้านไหนเลย ไม่มีเมนูฝั่งร้าน (แดชบอร์ด/รายการจอง ฯลฯ) ให้ใช้ */
export default function SuperAdmin({ shops, onCreateShop, onSetShopStatus, onAddOwner }: SuperAdminProps) {
  const { navigate } = useNav()
  const [newName, setNewName] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [creating, setCreating] = useState(false)

  const [addOwnerFor, setAddOwnerFor] = useState<string | null>(null)
  const [addOwnerEmail, setAddOwnerEmail] = useState('')
  const [addingOwner, setAddingOwner] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim() || !newOwnerEmail.trim() || creating) return
    setCreating(true)
    try {
      await onCreateShop({ name: newName.trim(), ownerEmail: newOwnerEmail.trim() })
      setNewName('')
      setNewOwnerEmail('')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleStatus = async (shop: ShopAdmin) => {
    setTogglingId(shop.id)
    try {
      await onSetShopStatus(shop.id, shop.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')
    } finally {
      setTogglingId(null)
    }
  }

  const handleAddOwner = async (shopId: string) => {
    if (!addOwnerEmail.trim() || addingOwner) return
    setAddingOwner(true)
    try {
      await onAddOwner(shopId, addOwnerEmail.trim())
      setAddOwnerFor(null)
      setAddOwnerEmail('')
    } finally {
      setAddingOwner(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">Super Admin</h1>
            <p className="text-xs text-gray-400 leading-tight">จัดการร้านทั้งระบบ</p>
          </div>
        </div>
        <button
          onClick={() => navigate('login')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <LogOut size={14} />
          ออกจากระบบ
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* สร้างร้านใหม่ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Plus size={16} className="text-orange-500" />
            สร้างร้านใหม่
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            อีเมลเจ้าของร้านต้องเคย login เข้าระบบมาก่อนอย่างน้อย 1 ครั้ง (เป็นลูกค้าธรรมดา) ถึงจะผูกเป็นเจ้าของร้านได้
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="ชื่อร้าน"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 min-w-[160px] px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              type="email"
              placeholder="อีเมลเจ้าของร้าน"
              value={newOwnerEmail}
              onChange={e => setNewOwnerEmail(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || !newOwnerEmail.trim() || creating}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              สร้างร้าน
            </button>
          </div>
        </div>

        {/* รายชื่อร้านทั้งหมด */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">ร้านทั้งหมด ({shops.length})</h2>
          </div>

          {shops.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">ยังไม่มีร้านในระบบ</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {shops.map(shop => (
                <div key={shop.id} className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex-shrink-0 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                      <Store size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{shop.name}</p>
                      <p className="text-xs text-gray-400">
                        /{shop.slug} · owner {shop._count?.owners ?? 0} คน
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        shop.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {shop.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับอยู่'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => handleToggleStatus(shop)}
                      disabled={togglingId === shop.id}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50 ${
                        shop.status === 'ACTIVE'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {togglingId === shop.id ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                      {shop.status === 'ACTIVE' ? 'ระงับร้านนี้' : 'เปิดใช้งานอีกครั้ง'}
                    </button>
                    <button
                      onClick={() => {
                        setAddOwnerFor(addOwnerFor === shop.id ? null : shop.id)
                        setAddOwnerEmail('')
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      <UserPlus size={12} />
                      เพิ่ม owner
                    </button>
                  </div>

                  {addOwnerFor === shop.id && (
                    <div className="flex gap-2 mt-3">
                      <input
                        type="email"
                        placeholder="อีเมล owner คนใหม่"
                        value={addOwnerEmail}
                        onChange={e => setAddOwnerEmail(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <button
                        onClick={() => handleAddOwner(shop.id)}
                        disabled={!addOwnerEmail.trim() || addingOwner}
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        {addingOwner && <Loader2 size={12} className="animate-spin" />}
                        เพิ่ม
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
