import { useEffect, useRef } from 'react'
import { bookingsStreamUrl } from './api'

/** ต่อ connection ใหม่ทุกช่วงนี้ด้วย token สดจาก getToken() — สั้นกว่าอายุ access token ทั่วไปพอสมควร กัน SSE
 *  ค้างพยายาม reconnect ด้วย token เดิมที่หมดอายุไปแล้วเงียบๆ ไม่รู้ตัว (EventSource ของเบราว์เซอร์ reconnect
 *  อัตโนมัติเองเมื่อหลุด แต่ใช้ URL/token เดิมที่ผูกไว้ตอนเปิด ไม่มีทางส่ง token ใหม่เข้าไปตอน reconnect ได้) */
const REOPEN_MS = 10 * 60_000

/**
 * เปิด SSE ฟังสัญญาณ "มีการเปลี่ยนแปลงรายการจอง" จาก backend (ดู backend/src/realtime) แล้วเรียก onChanged ทันที
 * ให้ผู้เรียก refetch เอง — ตัว stream เองไม่มีข้อมูลจองจริงส่งมาด้วย (กัน bypass การเช็คสิทธิ์ role-based ที่ทำ
 * อยู่แล้วใน GET /bookings) แค่เป็นสัญญาณกระตุ้น ให้ผลลัพธ์เหมือนจอง/แก้ไขแล้วเห็นแทบจะทันทีแทนที่จะรอ poll รอบถัดไป
 */
export function useBookingsStream(enabled: boolean, getToken: () => Promise<string>, onChanged: () => void) {
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
          source = new EventSource(bookingsStreamUrl(token))
          source.onmessage = event => {
            if (event.data === 'changed') onChangedRef.current()
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
