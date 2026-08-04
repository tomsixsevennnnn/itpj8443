import { AlertTriangle, X } from 'lucide-react'

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

/** แจ้งเตือนตอนทำรายการ (จอง/แก้แพ็กเกจ/แก้เมนู ฯลฯ) ไม่สำเร็จ — ลอยด้านบน ปิดเองได้ */
export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
      <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl shadow-lg px-4 py-3">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <p className="text-sm flex-1 leading-snug">{message}</p>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
