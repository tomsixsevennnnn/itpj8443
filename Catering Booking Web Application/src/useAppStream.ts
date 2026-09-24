import { useEffect, useRef } from 'react'
import { appStreamUrl } from './api'

/** ต่อ connection ใหม่ทุกช่วงนี้ด้วย token สดจาก getToken() — เหตุผลเดียวกับ useBookingsStream.ts */
const REOPEN_MS = 10 * 60_000

export type AppChangeTopic = 'settings' | 'catalog' | 'users' | 'audit'

/**
 * เปิด SSE ฟังสัญญาณ "มีการเปลี่ยนแปลง" ของหัวข้ออื่นนอกจาก bookings (settings/เมนู-แพ็กเกจ/สิทธิ์ผู้ใช้/ประวัติ
 * การแก้ไข) จาก backend (ดู backend/src/realtime) แล้วเรียก onChanged(topic) ให้ผู้เรียก refetch เฉพาะส่วนที่
 * เกี่ยวข้องเอง — ตัว stream เองไม่มีข้อมูลจริงส่งมาด้วย เหมือน useBookingsStream.ts
 */
export function useAppStream(enabled: boolean, getToken: () => Promise<string>, onChanged: (topic: AppChangeTopic) => void) {
  const onChangedRef = useRef(onChanged)
  onChangedRef.current = onChanged

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let source: EventSource | null = null
    let reopenTimer: ReturnType<typeof setTimeout> | null = null

    const open = () => {
      getToken()
        .then(token => {
          if (cancelled) return
          source = new EventSource(appStreamUrl(token))
          source.onmessage = event => {
            if (event.data === 'settings' || event.data === 'catalog' || event.data === 'users' || event.data === 'audit') {
              onChangedRef.current(event.data)
            }
          }
          reopenTimer = setTimeout(() => {
            source?.close()
            open()
          }, REOPEN_MS)
        })
        .catch(() => {
          // ขอ token ไม่สำเร็จ (เช่น session หมดอายุ) — ปล่อยผ่าน ให้ poll ที่เหลือใน App.tsx เป็น fallback แทน
        })
    }
    open()

    return () => {
      cancelled = true
      source?.close()
      if (reopenTimer) clearTimeout(reopenTimer)
    }
  }, [enabled])
}
