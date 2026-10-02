import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import type { Booking } from '../../types'

interface StatusFeedback {
  kind: 'success' | 'error'
  text: string
}

/**
 * เปลี่ยนสถานะใบจอง พร้อมบอกผู้ใช้ว่า "กำลังเปลี่ยน" (pending — ใช้โชว์ spinner/ล็อกปุ่มกันกดซ้ำ) และ "สำเร็จหรือไม่"
 * (feedback — หายเองหลัง 4 วินาที) — onUpdateBooking คืน true/false ว่าสำเร็จหรือไม่ (error ละเอียดโชว์ที่แถบแจ้งเตือนรวมของ App อยู่แล้ว)
 */
export function useStatusUpdate(
  onUpdateBooking: (id: string, patch: Partial<Booking>) => Promise<boolean>,
  statusLabel: (status: Booking['status']) => string,
) {
  const [pending, setPending] = useState<{ id: string; status: Booking['status'] } | null>(null)
  const [feedback, setFeedback] = useState<StatusFeedback | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const run = async (id: string, status: Booking['status']): Promise<boolean> => {
    if (pending) return false
    clearTimeout(timerRef.current)
    setFeedback(null)
    setPending({ id, status })
    const ok = await onUpdateBooking(id, { status })
    setPending(null)
    const label = statusLabel(status)
    setFeedback(
      ok
        ? { kind: 'success', text: `เปลี่ยนสถานะเป็น "${label}" สำเร็จ` }
        : { kind: 'error', text: `เปลี่ยนสถานะเป็น "${label}" ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง` },
    )
    timerRef.current = setTimeout(() => setFeedback(null), 4000)
    return ok
  }

  return { pending, feedback, run }
}

/** ข้อความผลลัพธ์การเปลี่ยนสถานะ (สำเร็จ = เขียว, ไม่สำเร็จ = แดง) — ไม่โชว์อะไรถ้ายังไม่มีผล */
export function StatusFeedbackNote({ feedback }: Readonly<{ feedback: StatusFeedback | null }>) {
  if (!feedback) return null
  const ok = feedback.kind === 'success'
  return (
    <p
      role="status"
      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ${
        ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {ok ? <Check size={13} /> : <AlertTriangle size={13} />}
      {feedback.text}
    </p>
  )
}
