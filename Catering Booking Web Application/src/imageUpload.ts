/** ความกว้าง/สูงสูงสุดหลังย่อรูป (px) */
export const MAX_IMAGE_DIMENSION = 900
/** ขนาดไฟล์ต้นฉบับสูงสุดที่รับ (ไบต์) */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'))
    reader.readAsDataURL(file)
  })

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพที่เปิดได้'))
    img.src = src
  })

/**
 * อ่านไฟล์รูปจากเครื่อง ย่อขนาดให้ไม่เกิน MAX_IMAGE_DIMENSION
 * แล้วคืนค่าเป็น data URL พร้อมใช้กับ <img src>
 */
export async function pickImageAsDataUrl(file: File, maxDimension = MAX_IMAGE_DIMENSION): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพ')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('ไฟล์ใหญ่เกิน 8 MB กรุณาเลือกรูปที่เล็กลง')

  const raw = await readAsDataUrl(file)
  const img = await loadImage(raw)

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  // รูปเล็กอยู่แล้วและไม่ใช่ไฟล์ใหญ่ ใช้ต้นฉบับได้เลย
  if (scale === 1 && file.size <= 400 * 1024) return raw

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) return raw

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  // ไฟล์โปร่งใส (png/webp) เก็บเป็น png เพื่อไม่ให้พื้นหลังกลายเป็นดำ
  const keepAlpha = file.type === 'image/png' || file.type === 'image/webp'
  return canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.82)
}
