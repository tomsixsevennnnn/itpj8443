import { AlertTriangle, Loader2, RotateCw } from 'lucide-react'

interface SlipLoadStatusProps {
  failed: boolean
  onRetry: () => void
  className?: string
}

/** กล่องสถานะระหว่างโหลดสลิป — กำลังโหลด (หมุน) หรือโหลดไม่สำเร็จ (ข้อความ + ปุ่มลองใหม่) */
export default function SlipLoadStatus({ failed, onRetry, className = 'h-40' }: Readonly<SlipLoadStatusProps>) {
  if (failed) {
    return (
      <div
        className={`w-full ${className} flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm gap-2 px-4 text-center`}
      >
        <span className="flex items-center gap-1.5 font-medium">
          <AlertTriangle size={15} />
          โหลดสลิปไม่สำเร็จ
        </span>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-red-200 hover:bg-red-100 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RotateCw size={12} />
          ลองใหม่
        </button>
      </div>
    )
  }
  return (
    <div
      className={`w-full ${className} flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm gap-2`}
    >
      <Loader2 size={16} className="animate-spin" />
      กำลังโหลดสลิป...
    </div>
  )
}
