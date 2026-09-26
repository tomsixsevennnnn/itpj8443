import { Download, X } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt: string
  /** ชื่อไฟล์ตอนกดดาวน์โหลด */
  fileName?: string
  onClose: () => void
  /** ปรับ z-index ตาม popup ที่ครอบอยู่ (เช่น เปิดจาก popup อื่นที่ z-50 อยู่แล้ว ต้องสูงกว่า) */
  zIndexClass?: string
}

/** เปิดรูปเต็มจอ พร้อมปุ่มดาวน์โหลด — ใช้ดูสลิปโอนเงิน/รูปเมนูแบบขยาย */
export default function ImageLightbox({ src, alt, fileName = 'image.jpg', onClose, zIndexClass = 'z-[60]' }: ImageLightboxProps) {
  return (
    <div
      className={`fixed inset-0 bg-black/80 ${zIndexClass} flex items-center justify-center p-4`}
      onClick={onClose}
      // ปุ่มปิด/ดาวน์โหลดข้างในเป็นปุ่มจริงอยู่แล้ว (tab ไปกดได้ปกติ) — ช่องทางคีย์บอร์ดของ div นี้เองคือ Escape
      // ปิดจาก event bubble ขึ้นมาจากลูกที่ focus อยู่ (ไม่ใส่ role/tabIndex ตรงนี้เพราะข้างในมี <a>/<button>
      // ซ้อนอยู่แล้ว การทำ div นี้เป็น interactive element เองจะผิด a11y ซ้อน control ในปุ่มเดียวกัน)
      onKeyDown={e => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a
          href={src}
          download={fileName}
          onClick={e => e.stopPropagation()}
          aria-label="ดาวน์โหลดรูป"
          className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <Download size={18} />
        </a>
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded-xl"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      />
    </div>
  )
}
