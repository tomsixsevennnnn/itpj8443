import { useEffect, useState } from 'react'
import {
  Check,
  History,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Power,
  Receipt,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Store,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useNav } from '../NavContext'
import type { AuditLogPage, BackendUser, ShopAdmin } from '../api'
import AuditLog from './owner/AuditLog'

interface SuperAdminProps {
  shops: ShopAdmin[]
  /** owner ทุกคนข้ามทุกร้าน (มี .shop กำกับ) — ใช้แสดงรายชื่อ owner ใต้การ์ดแต่ละร้าน */
  owners: BackendUser[]
  onCreateShop: (input: { name: string; ownerEmail: string }) => Promise<void>
  onSetShopStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') => Promise<void>
  onAddOwner: (id: string, email: string) => Promise<void>
  onRemoveOwner: (shopId: string, userId: string) => Promise<void>
  onUpdateShop: (id: string, input: { name: string; slug?: string }) => Promise<void>
  onSearchUser: (email: string) => Promise<BackendUser[]>
  onSetSuperAdmin: (userId: string, isSuperAdmin: boolean) => Promise<void>
  onFetchAuditPage: (page: number, pageSize: number) => Promise<AuditLogPage>
  auditRefreshSignal: number
}

type Tab = 'shops' | 'admins' | 'audit'

/** หน้าเดียวจบสำหรับ super admin — จัดการร้านทั้งระบบ (สร้าง/แก้ไข/ระงับ-เปิดใช้งาน/เพิ่ม-ถอด owner), แต่งตั้ง
 *  super admin คนอื่น และดูประวัติการแก้ไขข้ามทุกร้าน — ไม่ใช้ OwnerLayout เพราะเป็นบทบาทที่ไม่ผูกกับร้านไหนเลย */
export default function SuperAdmin({
  shops,
  owners,
  onCreateShop,
  onSetShopStatus,
  onAddOwner,
  onRemoveOwner,
  onUpdateShop,
  onSearchUser,
  onSetSuperAdmin,
  onFetchAuditPage,
  auditRefreshSignal,
}: SuperAdminProps) {
  const { navigate } = useNav()
  const [tab, setTab] = useState<Tab>('shops')

  const [newName, setNewName] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [creating, setCreating] = useState(false)

  const [addOwnerFor, setAddOwnerFor] = useState<string | null>(null)
  const [addOwnerEmail, setAddOwnerEmail] = useState('')
  const [addingOwner, setAddingOwner] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [removingOwnerId, setRemovingOwnerId] = useState<string | null>(null)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameSlugValue, setRenameSlugValue] = useState('')
  const [renaming, setRenaming] = useState(false)

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

  const handleRemoveOwner = async (shopId: string, userId: string) => {
    setRemovingOwnerId(userId)
    try {
      await onRemoveOwner(shopId, userId)
    } finally {
      setRemovingOwnerId(null)
    }
  }

  const startRename = (shop: ShopAdmin) => {
    setRenamingId(shop.id)
    setRenameValue(shop.name)
    setRenameSlugValue(shop.slug)
  }

  /** onUpdateShop ห่อด้วย runAction ที่ App.tsx เสมอ (error ไปขึ้น ErrorBanner ด้านบน ไม่ throw กลับมาที่นี่) —
   *  ปิดฟอร์มทันทีหลังเรียกจบเหมือน handleCreate/handleAddOwner ด้านบน ถ้า backend ปฏิเสธ (เช่น slug ซ้ำ) จะเห็น
   *  ข้อความ error ที่ ErrorBanner แทน ต้องกดแก้ไขใหม่เอง */
  const handleRename = async (shop: ShopAdmin) => {
    if (!renameValue.trim() || !renameSlugValue.trim() || renaming) return
    setRenaming(true)
    try {
      // ส่ง slug ไปด้วยเฉพาะตอนเปลี่ยนจริงๆ — ลด request ที่ไม่จำเป็น และไม่ไปชนเช็คความซ้ำของ slug ตัวเองที่ backend
      await onUpdateShop(shop.id, {
        name: renameValue.trim(),
        slug: renameSlugValue.trim() !== shop.slug ? renameSlugValue.trim() : undefined,
      })
      setRenamingId(null)
    } finally {
      setRenaming(false)
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
        {/* สลับหน้า */}
        <div className="flex gap-1.5 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
          {([
            { id: 'shops' as const, label: 'ร้านค้า', icon: Store },
            { id: 'admins' as const, label: 'Super Admin', icon: ShieldCheck },
            { id: 'audit' as const, label: 'ประวัติการแก้ไข', icon: History },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'shops' && (
          <>
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
                          {renamingId === shop.id ? (
                            <div className="space-y-1.5">
                              <input
                                autoFocus
                                type="text"
                                placeholder="ชื่อร้าน"
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleRename(shop)}
                                className="w-full px-2 py-1 border border-orange-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
                              />
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-400 flex-shrink-0">/</span>
                                <input
                                  type="text"
                                  placeholder="path เฉพาะร้าน เช่น pipat-catering"
                                  value={renameSlugValue}
                                  onChange={e => setRenameSlugValue(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleRename(shop)}
                                  className="flex-1 min-w-0 px-2 py-1 border border-orange-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                                <button
                                  onClick={() => handleRename(shop)}
                                  disabled={!renameValue.trim() || !renameSlugValue.trim() || renaming}
                                  className="text-green-600 hover:text-green-700 disabled:opacity-50 flex-shrink-0"
                                >
                                  {renaming ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                </button>
                                <button
                                  onClick={() => setRenamingId(null)}
                                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-gray-800 truncate">{shop.name}</p>
                                <button
                                  onClick={() => startRename(shop)}
                                  className="text-gray-300 hover:text-orange-500 flex-shrink-0"
                                  title="แก้ชื่อ/path ร้าน"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                              <p className="text-xs text-gray-400">/{shop.slug}</p>
                            </>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                            shop.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {shop.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับอยู่'}
                        </span>
                      </div>

                      {/* สรุปภาพรวม — จำนวน owner/booking และยอดขายรวม (ไม่รวมใบจองที่ยกเลิก) */}
                      <div className="flex gap-4 mt-3 px-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-gray-400" />
                          {shop._count?.owners ?? 0} owner
                        </span>
                        <span className="flex items-center gap-1">
                          <Receipt size={12} className="text-gray-400" />
                          {(shop._count?.bookings ?? 0).toLocaleString()} การจอง
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-orange-600">
                          {(shop.totalRevenue ?? 0).toLocaleString()} ฿
                        </span>
                      </div>

                      {/* เจ้าของร้านนี้ทั้งหมด — ถอดออกได้ทีละคน (กลับไปเป็นลูกค้าธรรมดา) */}
                      {owners.filter(o => o.shop?.id === shop.id).length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {owners
                            .filter(o => o.shop?.id === shop.id)
                            .map(owner => (
                              <div
                                key={owner.id}
                                className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-700 truncate">
                                    {owner.name} {owner.surname}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">{owner.email}</p>
                                </div>
                                <button
                                  onClick={() => handleRemoveOwner(shop.id, owner.id)}
                                  disabled={removingOwnerId === owner.id}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 flex-shrink-0"
                                >
                                  {removingOwnerId === owner.id ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <UserMinus size={11} />
                                  )}
                                  ถอดออก
                                </button>
                              </div>
                            ))}
                        </div>
                      )}

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
          </>
        )}

        {tab === 'admins' && <SuperAdminManager onSearchUser={onSearchUser} onSetSuperAdmin={onSetSuperAdmin} />}

        {tab === 'audit' && <AuditLog onFetchPage={onFetchAuditPage} refreshSignal={auditRefreshSignal} />}
      </div>
    </div>
  )
}

interface SuperAdminManagerProps {
  onSearchUser: (email: string) => Promise<BackendUser[]>
  onSetSuperAdmin: (userId: string, isSuperAdmin: boolean) => Promise<void>
}

/** ค้นหาผู้ใช้ด้วยอีเมล (ต้องเคย login เข้าระบบมาก่อนอย่างน้อย 1 ครั้ง) แล้วตั้ง/ถอด SUPER_ADMIN ได้ — เว้น OWNER
 *  ไว้ไม่ให้แตะจากหน้านี้ (ต้องผ่านหน้าจัดการร้านเท่านั้น เพราะ OWNER ต้องมี shopId คู่กันเสมอ ดู users.service.ts) */
function SuperAdminManager({ onSearchUser, onSetSuperAdmin }: SuperAdminManagerProps) {
  const [email, setEmail] = useState('')
  const [debouncedEmail, setDebouncedEmail] = useState('')
  const [results, setResults] = useState<BackendUser[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(email.trim()), 300)
    return () => clearTimeout(timer)
  }, [email])

  useEffect(() => {
    if (debouncedEmail.length < 3) {
      setResults(null)
      setSearchError(null)
      return
    }
    setSearching(true)
    setSearchError(null)
    onSearchUser(debouncedEmail)
      .then(setResults)
      .catch(err => {
        setSearchError(err instanceof Error ? err.message : 'ค้นหาไม่สำเร็จ')
        setResults(null)
      })
      .finally(() => setSearching(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedEmail])

  const handleToggle = async (user: BackendUser) => {
    setActioningId(user.id)
    try {
      await onSetSuperAdmin(user.id, user.role !== 'SUPER_ADMIN')
      setResults(prev =>
        prev
          ? prev.map(u => (u.id === user.id ? { ...u, role: u.role === 'SUPER_ADMIN' ? 'CUSTOMER' : 'SUPER_ADMIN' } : u))
          : prev,
      )
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
        <ShieldCheck size={16} className="text-orange-500" />
        แต่งตั้ง / ถอด Super Admin
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        ค้นหาด้วยอีเมล (พิมพ์อย่างน้อย 3 ตัวอักษร) — ผู้ใช้ต้องเคย login เข้าระบบมาก่อนอย่างน้อย 1 ครั้ง
      </p>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาด้วยอีเมล..."
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {searching && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
          <Loader2 size={14} className="animate-spin" />
          กำลังค้นหา...
        </div>
      )}
      {searchError && <p className="text-sm text-red-500 text-center py-4">{searchError}</p>}
      {!searching && results !== null && results.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">ไม่พบผู้ใช้ที่ตรงกับคำค้นหา</p>
      )}

      {!searching && results && results.length > 0 && (
        <div className="space-y-2">
          {results.map(user => (
            <div key={user.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {user.name} {user.surname}
                </p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              {user.role === 'OWNER' ? (
                <span className="text-[10px] text-gray-400 flex-shrink-0">เจ้าของร้าน — จัดการที่แท็บร้านค้า</span>
              ) : (
                <button
                  onClick={() => handleToggle(user)}
                  disabled={actioningId === user.id}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 ${
                    user.role === 'SUPER_ADMIN'
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                  }`}
                >
                  {actioningId === user.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : user.role === 'SUPER_ADMIN' ? (
                    <ShieldOff size={12} />
                  ) : (
                    <ShieldCheck size={12} />
                  )}
                  {user.role === 'SUPER_ADMIN' ? 'ถอด Super Admin' : 'ตั้งเป็น Super Admin'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
