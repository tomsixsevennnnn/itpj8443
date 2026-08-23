import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, History, Loader2 } from 'lucide-react'
import type { AuditLogEntry, AuditLogPage } from '../../api'

interface AuditLogProps {
  onFetchPage: (page: number, pageSize: number) => Promise<AuditLogPage>
}

const PAGE_SIZE = 20

/** ป้าย action อ่านง่าย — แปลจาก action string ฝั่ง backend (ดู service ต่างๆ ที่เรียก audit.log) */
const ACTION_LABEL: Record<string, string> = {
  'menu.create': 'เพิ่มเมนู',
  'menu.update': 'แก้ไขเมนู',
  'menu.delete': 'ลบเมนู',
  'package.create': 'เพิ่มแพ็กเกจ',
  'package.update': 'แก้ไขแพ็กเกจ',
  'package.delete': 'ลบแพ็กเกจ',
  'booking.update': 'แก้ไขใบจอง',
  'settings.update': 'แก้ไขค่าตั้งค่าร้าน',
  'user.setRole': 'เปลี่ยนสิทธิ์ผู้ใช้',
}

const actionLabel = (action: string) => ACTION_LABEL[action] ?? action

const actionTone = (action: string) =>
  action.endsWith('.delete')
    ? 'bg-red-50 text-red-600'
    : action.endsWith('.create')
      ? 'bg-green-50 text-green-600'
      : 'bg-orange-50 text-orange-600'

function EntryRow({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false)
  const hasDetail = entry.before != null || entry.after != null

  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <button
        type="button"
        onClick={() => hasDetail && setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="min-w-0 flex items-center gap-2">
          {hasDetail && (open ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />)}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionTone(entry.action)}`}>
                {actionLabel(entry.action)}
              </span>
              <span className="text-xs text-gray-400">
                {entry.entityType} · {entry.entityId}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              โดย {entry.actorRole === 'OWNER' ? 'เจ้าของร้าน' : 'ลูกค้า'} ({entry.actorUserId.slice(0, 8)}…)
            </p>
          </div>
        </div>
        <span className="text-[11px] text-gray-400 flex-shrink-0">
          {new Date(entry.createdAt).toLocaleString('th-TH', {
            day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </button>

      {open && hasDetail && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 mb-1">ก่อนแก้ไข</p>
            <pre className="text-[10px] bg-white border border-gray-200 rounded-lg p-2 overflow-auto max-h-48 whitespace-pre-wrap break-all">
              {entry.before != null ? JSON.stringify(entry.before, null, 2) : '—'}
            </pre>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 mb-1">หลังแก้ไข</p>
            <pre className="text-[10px] bg-white border border-gray-200 rounded-lg p-2 overflow-auto max-h-48 whitespace-pre-wrap break-all">
              {entry.after != null ? JSON.stringify(entry.after, null, 2) : '—'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditLog({ onFetchPage }: AuditLogProps) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AuditLogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    onFetchPage(page, PAGE_SIZE)
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'โหลดประวัติไม่สำเร็จ'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="max-w-2xl space-y-5 pb-24">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <History size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ประวัติการแก้ไข</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          บันทึกการลบเมนู/แพ็กเกจ แก้ไขใบจอง/ค่าตั้งค่าร้าน และเลื่อน/ถอดสิทธิ์เจ้าของร้าน — ล่าสุดขึ้นก่อน
        </p>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            กำลังโหลด...
          </div>
        )}
        {!loading && error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertTriangle size={12} />
            {error}
          </p>
        )}
        {!loading && !error && data && data.items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีประวัติการแก้ไข</p>
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <div className="space-y-2">
            {data.items.map(entry => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {!loading && data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              ก่อนหน้า
            </button>
            <span className="text-xs text-gray-400">หน้า {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
