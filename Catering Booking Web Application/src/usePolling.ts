import { useEffect, useRef } from 'react'

/**
 * เรียก callback ทันทีตอน mount แล้ว poll ซ้ำทุก intervalMs
 * หยุดพักอัตโนมัติเมื่อสลับแท็บ (document.hidden) กันยิง request เปล่าตอนไม่มีใครดูอยู่
 * กลับมาที่แท็บจะดึงค่าล่าสุดทันที
 */
export function usePolling(callback: () => void, intervalMs: number) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const tick = () => callbackRef.current()

    const start = () => {
      if (intervalId != null) return
      tick()
      intervalId = setInterval(tick, intervalMs)
    }
    const stop = () => {
      if (intervalId == null) return
      clearInterval(intervalId)
      intervalId = null
    }

    const handleVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [intervalMs])
}
