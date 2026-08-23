import { useEffect, useState } from 'react'
import generatePayload from 'promptpay-qr'
import { toDataURL } from 'qrcode'

interface PromptPayQrProps {
  /** เบอร์โทร/เลขบัตร ปชช./เลขวอลเล็ตที่ผูกกับพร้อมเพย์ร้าน (AppSettings.shopInfo.promptPayId) */
  promptPayId: string
  /** ยอดเงินที่ต้องโอน (บาท) — ฝังไว้ใน QR เลย แอปธนาคารจะกรอกให้อัตโนมัติตอนสแกน กันลูกค้าพิมพ์ยอดผิด */
  amount: number
  size?: number
  className?: string
}

/** สร้าง QR พร้อมเพย์แบบ dynamic ต่อใบจอง (มาตรฐาน EMV ของ ธปท.) แทนรูป QR คงที่ที่ร้านอัปโหลดไว้ล่วงหน้า */
export default function PromptPayQr({ promptPayId, amount, size = 176, className }: PromptPayQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setDataUrl(null)
    setError(false)
    if (!promptPayId || amount <= 0) return

    let cancelled = false
    try {
      const payload = generatePayload(promptPayId, { amount })
      toDataURL(payload, { width: size, margin: 1 })
        .then(url => {
          if (!cancelled) setDataUrl(url)
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
    } catch {
      setError(true)
    }
    return () => {
      cancelled = true
    }
  }, [promptPayId, amount, size])

  if (error) return <p className="text-xs text-red-500">สร้าง QR พร้อมเพย์ไม่สำเร็จ — ตรวจสอบเลขพร้อมเพย์ในหน้าตั้งค่า</p>
  if (!dataUrl) return null

  return (
    <img
      src={dataUrl}
      alt={`QR พร้อมเพย์ยอด ${amount.toLocaleString()} บาท`}
      width={size}
      height={size}
      className={className}
    />
  )
}
