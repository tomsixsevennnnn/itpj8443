import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Search, Shield, ShieldOff, Users } from 'lucide-react'
import type { BackendUser } from '../../api'

interface UserRolesProps {
  onSearchUser: (email: string) => Promise<BackendUser[]>
  onSetRole: (userId: string, role: 'OWNER' | 'CUSTOMER') => Promise<void>
  onListOwners: () => Promise<BackendUser[]>
  /** auth0Sub ของ owner ที่ login อยู่ตอนนี้ — กันเผลอถอดสิทธิ์ owner ตัวเอง (backend กันแค่เคส "คนสุดท้าย"
   *  แต่เคสนี้ยังทำได้ถ้ามี owner คนอื่นเหลืออยู่ ซึ่งอาจไม่ตั้งใจ) */
  currentAuth0Sub?: string
}

interface UserRowProps {
  user: BackendUser
  isSelf: boolean
  busy: boolean
  onPromote: () => void
  onDemote: () => void
}

function UserRow({ user, isSelf, busy, onPromote, onDemote }: UserRowProps) {
  const isOwner = user.role === 'OWNER'
  return (
    <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {user.name} {user.surname}
          {isSelf && <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(คุณ)</span>}
        </p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          สมัครเมื่อ {new Date(user.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
            isOwner ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isOwner ? 'เจ้าของร้าน' : 'ลูกค้า'}
        </span>
        {isOwner ? (
          <button
            onClick={onDemote}
            disabled={busy || isSelf}
            title={isSelf ? 'ถอดสิทธิ์ตัวเองไม่ได้' : undefined}
            className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 text-red-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
            ถอดสิทธิ์
          </button>
        ) : (
          <button
            onClick={onPromote}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs bg-orange-50 hover:bg-orange-100 disabled:bg-gray-100 disabled:text-gray-400 text-orange-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
            เลื่อนเป็นเจ้าของร้าน
          </button>
        )}
      </div>
    </div>
  )
}

export default function UserRoles({ onSearchUser, onSetRole, onListOwners, currentAuth0Sub }: UserRolesProps) {
  const [owners, setOwners] = useState<BackendUser[] | null>(null)
  const [loadingOwners, setLoadingOwners] = useState(true)
  const [ownersError, setOwnersError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [debouncedEmail, setDebouncedEmail] = useState('')
  const [results, setResults] = useState<BackendUser[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [actioningId, setActioningId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadOwners = () => {
    setLoadingOwners(true)
    setOwnersError(null)
    onListOwners()
      .then(setOwners)
      .catch(err => setOwnersError(err instanceof Error ? err.message : 'โหลดรายชื่อ owner ไม่สำเร็จ'))
      .finally(() => setLoadingOwners(false))
  }

  useEffect(() => {
    loadOwners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // debounce ช่องค้นหา 300ms กันยิง request รัวๆ ทุกตัวอักษรที่พิมพ์ (เหมือน Orders.tsx/BookingHistory.tsx)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(email.trim()), 300)
    return () => clearTimeout(timer)
  }, [email])

  // ค้นหาอัตโนมัติเมื่อพิมพ์ตั้งแต่ 3 ตัวอักษรขึ้นไป (ช่วยหาแบบพิมพ์ไม่ครบก็เจอ) — พิมพ์น้อยกว่านั้นยังไม่ยิง request
  useEffect(() => {
    if (debouncedEmail.length < 3) {
      setResults(null)
      setSearchError(null)
      return
    }
    setSearching(true)
    setSearchError(null)
    setActionError(null)
    onSearchUser(debouncedEmail)
      .then(setResults)
      .catch(err => {
        setSearchError(err instanceof Error ? err.message : 'ค้นหาไม่สำเร็จ')
        setResults(null)
      })
      .finally(() => setSearching(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedEmail])

  const handleSearch = () => setDebouncedEmail(email.trim())

  const handleSetRole = async (user: BackendUser, role: 'OWNER' | 'CUSTOMER') => {
    setActioningId(user.id)
    setActionError(null)
    try {
      await onSetRole(user.id, role)
      setResults(prev => (prev ? prev.map(u => (u.id === user.id ? { ...u, role } : u)) : prev))
      // เลื่อน/ถอดสิทธิ์แล้ว รายชื่อ owner ทั้งหมดด้านบนต้องเปลี่ยนตามด้วย (เพิ่ม/หลุดจากลิสต์) — โหลดใหม่จาก backend ตรงๆ
      // กันเคส reconcile array เองแล้วพลาด ง่ายและถูกต้องกว่าสำหรับลิสต์ที่ไม่ใหญ่แบบนี้
      loadOwners()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="max-w-2xl space-y-5 pb-24">
      {/* รายชื่อ owner ทั้งหมดตอนนี้ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Users size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">เจ้าของร้านทั้งหมด</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">รายชื่อผู้ที่มีสิทธิ์เจ้าของร้านอยู่ตอนนี้</p>

        {loadingOwners && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            กำลังโหลด...
          </div>
        )}
        {!loadingOwners && ownersError && (
          <p className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertTriangle size={12} />
            {ownersError}
          </p>
        )}
        {!loadingOwners && !ownersError && owners && (
          <div className="space-y-2">
            {owners.map(user => (
              <UserRow
                key={user.id}
                user={user}
                isSelf={!!currentAuth0Sub && user.auth0Sub === currentAuth0Sub}
                busy={actioningId === user.id}
                onPromote={() => handleSetRole(user, 'OWNER')}
                onDemote={() => handleSetRole(user, 'CUSTOMER')}
              />
            ))}
          </div>
        )}
      </div>

      {/* ค้นหาเพื่อเลื่อนคนใหม่เป็น owner */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">เพิ่ม/ถอดสิทธิ์เจ้าของร้าน</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          พิมพ์อีเมล (ไม่ต้องครบก็ค้นได้) ของผู้ใช้ที่เคย login เข้าระบบมาก่อนอย่างน้อย 1 ครั้ง เพื่อเลื่อน/ถอดสิทธิ์เจ้าของร้าน
        </p>

        <div className="flex gap-2 mb-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="อีเมลของผู้ใช้"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !email.trim()}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            ค้นหา
          </button>
        </div>

        {searchError && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
            <AlertTriangle size={12} />
            {searchError}
          </p>
        )}
        {actionError && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
            <AlertTriangle size={12} />
            {actionError}
          </p>
        )}

        {results && (
          <div className="mt-4 space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                ไม่พบผู้ใช้อีเมลนี้ — ต้องเคย login เข้าระบบมาก่อนอย่างน้อย 1 ครั้ง
              </p>
            ) : (
              results.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={!!currentAuth0Sub && user.auth0Sub === currentAuth0Sub}
                  busy={actioningId === user.id}
                  onPromote={() => handleSetRole(user, 'OWNER')}
                  onDemote={() => handleSetRole(user, 'CUSTOMER')}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
