import { useEffect, useState } from 'react'

/**
 * สลิปโอนเงินต้อง auth ถึงจะดูได้แล้ว (ไม่ใช่ static file สาธารณะเหมือนรูปเมนู/โลโก้ — ดู api.ts fetchPaymentSlip)
 * hook นี้ดึงเป็น blob object URL แทนการยัด path ตรงใน <img src> แบบเดิม และ revoke ทิ้งเองตอนเปลี่ยน/unmount
 */
export function useAuthedSlipUrl(
  bookingId: string | null | undefined,
  hasSlip: boolean,
  fetchSlipUrl: (bookingId: string) => Promise<string>,
): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId || !hasSlip) {
      setUrl(null)
      return
    }
    let cancelled = false
    let objectUrl: string | null = null
    fetchSlipUrl(bookingId)
      .then(u => {
        if (cancelled) {
          URL.revokeObjectURL(u)
          return
        }
        objectUrl = u
        setUrl(u)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [bookingId, hasSlip, fetchSlipUrl])

  return url
}
