import { useState } from 'react'
import { bankBrandOf } from '../banks'

interface BankBadgeProps {
  /** ชื่อธนาคาร (เช่น "ธนาคารกสิกรไทย") หรือรหัส 3 หลัก — ไม่รู้จัก = ไม่แสดงอะไร */
  bank: string
  size?: number
  className?: string
}

/**
 * โลโก้ธนาคาร (ไฟล์ภาพจริงใน public/banks — ที่มาดู public/banks/README.md) โหลดภาพไม่ได้ (ไฟล์หาย/ออฟไลน์) จะสลับเป็นวงกลมสีประจำธนาคาร
 * พร้อมอักษรย่อแทน ไม่ให้เหลือช่องว่างหรือรูปแตก
 */
export default function BankBadge({ bank, size = 22, className = '' }: Readonly<BankBadgeProps>) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const brand = bankBrandOf(bank)
  if (!brand) return null

  if (brand.logo && failedLogo !== brand.logo) {
    return (
      <img
        // ต่อกับ BASE_URL ของ Vite (เผื่อ deploy ใต้ path ย่อย) แทนใช้ path ขึ้นต้นด้วย / ตรงๆ
        src={`${import.meta.env.BASE_URL}${brand.logo.replace(/^\//, '')}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailedLogo(brand.logo ?? null)}
        className={`shrink-0 rounded-full bg-white object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: brand.color,
        color: brand.dark ? '#1f2937' : '#ffffff',
        fontSize: Math.max(7, Math.round(size * (brand.abbr.length > 3 ? 0.3 : 0.36))),
      }}
    >
      {brand.abbr}
    </span>
  )
}
