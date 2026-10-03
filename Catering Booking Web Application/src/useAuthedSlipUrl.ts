import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * สลิปโอนเงินต้อง auth ถึงจะดูได้แล้ว (ไม่ใช่ static file สาธารณะเหมือนรูปเมนู/โลโก้ — ดู api.ts fetchPaymentSlip)
 * hook นี้ดึงเป็น blob object URL แทนการยัด path ตรงใน <img src> แบบเดิม และ revoke ทิ้งเองตอนเปลี่ยน/unmount
 *
 * คืน { url, failed, retry } — failed = ดึงไม่สำเร็จ (เช่นไฟล์หายจาก server) ให้หน้าจอโชว์ข้อความ + ปุ่มลองใหม่ แทนที่จะหมุน
 * "กำลังโหลด" ค้างตลอดไป
 *
 * fetchSlipUrl เก็บใน ref (parent ส่งฟังก์ชันใหม่ทุก render — ถ้าใส่เป็น dependency จะยิงโหลดซ้ำทุกครั้งที่หน้าจอ re-render
 * เช่นตอน SSE/poll อัปเดตข้อมูล) ส่วน version (เช่น paymentSlipUploadedAt) ใช้ดึงใหม่เมื่อลูกค้าแนบสลิปใบใหม่ทับใบจองเดิม
 */
export function useAuthedSlipUrl(
  bookingId: string | null | undefined,
  hasSlip: boolean,
  fetchSlipUrl: (bookingId: string) => Promise<string>,
  version?: string | null,
): { url: string | null; failed: boolean; retry: () => void } {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const fetchRef = useRef(fetchSlipUrl)
  fetchRef.current = fetchSlipUrl

  useEffect(() => {
    setFailed(false)
    if (!bookingId || !hasSlip) {
      setUrl(null)
      return
    }
    let cancelled = false
    let objectUrl: string | null = null
    fetchRef
      .current(bookingId)
      .then(u => {
        if (cancelled) {
          URL.revokeObjectURL(u)
          return
        }
        objectUrl = u
        setUrl(u)
      })
      .catch(() => {
        if (cancelled) return
        setUrl(null)
        setFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [bookingId, hasSlip, version, attempt])

  const retry = useCallback(() => setAttempt(n => n + 1), [])
  return { url, failed, retry }
}
